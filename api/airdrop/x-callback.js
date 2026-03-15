// Vercel serverless entry for /api/airdrop/x-callback
const mod = require("./x-callback.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
