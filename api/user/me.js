const mod = require("./me.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
