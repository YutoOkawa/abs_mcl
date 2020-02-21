const mcl = require("mcl-wasm");
const utils = require("./utils");
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
        // TODO: Siの演算
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
        // TODO: Pjの演算
    }

    return sign;
}

function testABS() {
    const tpk = trusteeSetup();
    console.log("tpk",tpk);

    const keypair = authoritySetup(tpk);
    console.log("keypair",keypair);

    const ska = generateAttributes(keypair["ask"],["Aqours","AZALEA"]);
    console.log("ska",ska);

    const sign = generateSign(tpk,keypair["apk"],ska,"LoveLive","Aqours OR AZALEA")
    console.log("sign",sign);
}