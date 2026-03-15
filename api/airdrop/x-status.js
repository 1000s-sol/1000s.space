// Vercel serverless entry for /api/airdrop/x-status
const mod = require("./x-status.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
