// Vercel serverless entry for /api/airdrop/claim
const mod = require("./claim.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
