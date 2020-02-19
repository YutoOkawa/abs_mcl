const crypto = require("crypto");

exports.setOpt = function(obj,prop,val) {
    if (val !== undefined) {
        obj[prop] = val;
    } else {
        console.error("値がundefinedです。");
    }
}

exports.generateRandomG1 = function(mcl) {
    let buff = crypto.randomBytes(64);
    let g = mcl.hashAndMapToG1(buff.toString("hex"));
    return g;
}

exports.generateRandomG2 = function(mcl) {
    let buff = crypto.randomBytes(64);
    let h = mcl.hashAndMapToG2(buff.toString("hex"));
    return h;
}

exports.generateRandomFr = function(mcl) {
    let point = new mcl.Fr();
    point.setBySCPRNG();
    return point;
}