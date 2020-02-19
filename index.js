const mcl = require("mcl-wasm");
const utils = require("./utils");

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

function testABS() {
    const tpk = trusteeSetup();
    console.log("tpk",tpk);

    const keypair = authoritySetup(tpk);
    console.log("keypair",keypair);
}