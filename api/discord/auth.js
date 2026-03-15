const mod = require("./auth.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
