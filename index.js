const mcl = require("mcl-wasm");
const crypto = require("crypto");

mcl.init(mcl.BN254)
    .then(function() {
        console.log("init complete");
        testABS();
    });

function generateRandomG1() {
    let buff = crypto.randomBytes(64);
    let hex = buff.toString("hex");
    let g = mcl.hashAndMapToG1(hex);
    return g;
}

function generateRandomG2() {
    let buff = crypto.randomBytes(64);
    let hex = buff.toString("hex");
    let h = mcl.hashAndMapToG2(hex);
    return h;
}

function trusteeSetup() {
    const tpk = {};
    const tmax = 10;
    tpk['g'] = generateRandomG1();
    for (var i=0; i<tmax+1; i++) {
        tpk['h'+String(i)] = generateRandomG2();
    }
    return tpk;
}

function testABS() {
    const tpk = trusteeSetup();
    console.log(tpk);
}