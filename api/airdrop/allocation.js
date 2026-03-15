// Vercel serverless entry for /api/airdrop/allocation
const mod = require("./allocation.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
