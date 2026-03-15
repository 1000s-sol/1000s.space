const mod = require("./callback.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
