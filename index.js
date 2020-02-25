const mcl = require("mcl-wasm");
const utils = require("./utils");
const attributes_list = ["Aqours","AZALEA","GuiltyKiss","CYaRon"];
const attributes = {"Aqours":2,"AZALEA":3,"GuiltyKiss":4,"CYaRon":5};
const attribute_msp = {"Aqours":2,2:"Aqours","AZALEA":3,3:"AZALEA","GuiltyKiss":4,4:"GuiltyKiss","CYaRon":5,5:"CYaRon"};

mcl.init(mcl.BN254)
    .then(function() {
        console.log("init complete");
        testABS();
    });

function generateRandomFr() {
    let point = new mcl.Fr();
    point.setByCSPRNG();
    return point;
}

function trusteeSetup() {
    const tpk = {};
    const tmax = 10;

    const g = utils.generateRandomG1(mcl);
    utils.setOpt(tpk,"g",g);

    for (var i=0; i<tmax+1; i++) {
        let h = utils.generateRandomG2(mcl);
        utils.setOpt(tpk,"h"+String(i),h);
    }
    return tpk;
}

function authoritySetup(tpk) {
    const keypair = {};
    const ask = {};
    const apk = {};
    const tmax = 10;

    const a0 = generateRandomFr();
    const a = generateRandomFr();
    const b = generateRandomFr();
    utils.setOpt(ask,"a0",a0);
    utils.setOpt(ask,"a",a);
    utils.setOpt(ask,"b",b);

    const A0 = mcl.mul(tpk["h0"],a0);
    utils.setOpt(apk,"A0",A0);

    for (var i=1; i<tmax+1; i++) {
        let A = mcl.mul(tpk["h"+String(i)],a);
        utils.setOpt(apk,"A"+String(i),A);
    }

    for (var i=1; i<tmax+1; i++) {
        let B = mcl.mul(tpk["h"+String(i)],b);
        utils.setOpt(apk,"B"+String(i),B);
    }

    const c = generateRandomFr();
    const C = mcl.mul(tpk["g"],c);
    utils.setOpt(apk,"C",C);

    utils.setOpt(keypair,"ask",ask);
    utils.setOpt(keypair,"apk",apk);

    return keypair;
}

function generateAttributes(ask,attriblist) {
    const ska = {};

    const Kbase = utils.generateRandomG1(mcl);
    utils.setOpt(ska,"Kbase",Kbase);

    // Fr上における1の設定
    const Fr_num_1 = new mcl.Fr();
    Fr_num_1.setInt(1);
    // K0 = (1/a0) * Kbase
    const k0 = mcl.div(Fr_num_1,ask["a0"]);
    const K0 = mcl.mul(Kbase,k0);
    utils.setOpt(ska,"K0",K0);

    for (let i in attriblist) {
        // Fr上におけるnumberの設定
        let number = attributes[attriblist[i]];
        let Fr_num_x = new mcl.Fr();
        Fr_num_x.setInt(number);

        // Ku = (1/(a+bu)) * Kbase
        let bu = mcl.mul(Fr_num_x,ask["b"]);
        let ku= mcl.add(ask["a"],bu);
        ku = mcl.div(Fr_num_1,ku);
        let Ku = mcl.mul(Kbase,ku);
        utils.setOpt(ska,"K"+String(number),Ku);
    }

    return ska;
}

function generateSign(tpk,apk,ska,message,policy) {
    const sign = {};
    const r = [];
    // TODO: getMSP関数の作成
    const msp = [[1],[1],[0],[0]];

    // μ = hash(message|policy)
    const μ = mcl.hashToFr(message+policy);

    for (let i=0; i<msp.length+1; i++) {
        r.push(generateRandomFr());
    }

    const Y = mcl.mul(ska["Kbase"],r[0]);
    utils.setOpt(sign,"Y",Y);

    const W = mcl.mul(ska["K0"],r[0]);
    utils.setOpt(sign,"W",W);

    for (let i=1; i<msp.length+1; i++) {
        let Si;
        // multi = (C + g^μ)^r_i
        let multi = mcl.mul(tpk["g"],μ);
        multi = mcl.add(multi,apk["C"]);
        multi = mcl.mul(multi,r[i]);

        // multi = multi + (ska[Ki]^r0)
        if (ska["K"+String(i)] != undefined) {
            let K = mcl.mul(ska["K"+String(i)],r[0]);
            multi = mcl.add(multi,K);
        }

        Si = multi;
        utils.setOpt(sign,"S"+String(i),Si);
    }

    for (let j=1; j<msp[0].length+1; j++) {
        var Pj = new mcl.G2();
        for (let i=1; i<msp.length+1; i++) {
            // base = Aj + Bj^ui
            let ui = new mcl.Fr();
            ui.setInt(attributes[attribute_msp[attributes_list[i-1]]]);
            let base = mcl.mul(apk["B"+String(j)],ui);
            base = mcl.add(apk["A"+String(j)],base);

            // Pj = base ^ Mij*ri
            let exp_fr = new mcl.Fr();
            exp_fr.setInt(msp[i-1][j-1]);
            let exp = mcl.mul(exp_fr,r[i]);
            let multi = mcl.mul(base,exp);

            // Pj += multi
            Pj = mcl.add(Pj,multi);
        }
        utils.setOpt(sign,"P"+String(j),Pj);
    }
    return sign;
}

function verify(tpk,apk,sign,message,policy) {
    // TODO: getMSP関数の実装
    const msp = [[1],[1],[0],[0]];

    // μ = hash(message | policy)
    const μ = mcl.hashToFr(message+policy);

    // Yの検証
    if (sign["Y"].isZero()) {
        return false;
    }

    // e(W,A0) =? e(Y,h0)
    const pair_wa0 = mcl.pairing(sign["W"],apk["A0"]);
    const pair_Yh0 = mcl.pairing(sign["Y"],tpk["h0"]);
    if (!pair_wa0.isEqual(pair_Yh0)) {
        return false;
    }

    for (let j=1; j<msp[0].length+1; j++) {
        // e(Si,(AjBj^ui)^Mij)の計算
        // a = Si, b = (AjBj^ui)^Mij
        var multi = new mcl.GT();
        for (let i=1; i<msp.length+1; i++) {
            let a = sign["S"+String(i)];
            let ui = new mcl.Fr();
            ui.setInt(attribute_msp[attributes_list[i-1]]);
            let Bj = mcl.mul(apk["B"+String(j)],ui);
            let b = mcl.add(apk["A"+String(j)],Bj);
            let exp_b = new mcl.Fr();
            exp_b.setInt(msp[i-1][j-1]);
            b = mcl.mul(b,exp_b);
            let mul_pairing = mcl.pairing(a,b);
            multi = mcl.add(multi,mul_pairing);
            // console.log("pairing",multi);
        }
        // console.log("multi",multi);
        // j==1 e(Y,h1)e(Cg^μ,P1)
        // j>1 e(Cg^μ,Pj)
        // ver_pairing = e(Cg^μ,Pj)
        let cg = mcl.mul(tpk["g"],μ);
        cg = mcl.add(apk["C"],cg);
        var ver_pairing = mcl.pairing(cg,sign["P"+String(j)]);
        if (j==1) {
            // before = e(Y,h1)
            let before = mcl.pairing(sign["Y"],tpk["h"+String(1)]);
            ver_pairing = mcl.add(ver_pairing,before);
        }
        // console.log("ver_pairing",ver_pairing);
        if (!multi.isEqual(ver_pairing)) {
            return false;
        }
    }
    return true;
}

function testABS() {
    console.time("Setup");
    const tpk = trusteeSetup();
    // console.log("tpk",tpk);

    const keypair = authoritySetup(tpk);
    console.timeEnd("Setup");
    console.log("Setup Completed.");
    // console.log("keypair",keypair);

    console.time("AttrGen");
    const ska = generateAttributes(keypair["ask"],["Aqours"]);
    console.timeEnd("AttrGen");
    console.log("Key Generated.")
    // console.log("ska",ska);

    console.time("Sign");
    const sign = generateSign(tpk,keypair["apk"],ska,"LoveLive","Aqours OR AZALEA");
    console.timeEnd("Sign");
    console.log("Sign Generated.")
    // console.log("sign",sign);

    console.time("Ver");
    const ver = verify(tpk,keypair["apk"],sign,"LoveLive","Aqours OR AZALEA");
    console.timeEnd("Ver");
    if (ver) {
        console.log("OK");
    } else {
        console.log("failed...");
    }
    // console.log("ver",ver);
}