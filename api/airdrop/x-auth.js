// Vercel serverless entry for /api/airdrop/x-auth
const mod = require("./x-auth.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
