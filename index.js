const mcl = require("mcl-wasm");
const utils = require("./utils");
const attributes = {"a":2,"b":3,"c":4,"d":5,"e":6}

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

    const Fr_num_1 = new mcl.Fr();
    Fr_num_1.setInt(1);
    const k0 = mcl.div(Fr_num_1,ask["a0"]);
    const K0 = mcl.mul(Kbase,k0);
    utils.setOpt(ska,"K0",K0);

    for (let i in attriblist) {
        let number = attributes[attriblist[i]];
        let Fr_num_x = new mcl.Fr();
        Fr_num_x.setInt(number);

        let bu = mcl.mul(Fr_num_x,ask["b"]);
        let kx = mcl.add(ask["a"],bu);
        kx = mcl.div(Fr_num_1,kx);

        let Kx = mcl.mul(Kbase,kx);
        utils.setOpt(ska,"K"+String(number),Kx);
    }

    return ska;
}

function testABS() {
    const tpk = trusteeSetup();
    console.log("tpk",tpk);

    const keypair = authoritySetup(tpk);
    console.log("keypair",keypair);

    const ska = generateAttributes(keypair["ask"],["a","b"]);
    console.log("ska",ska);
}