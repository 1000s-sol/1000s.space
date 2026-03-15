const mod = require("./link-wallet.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
