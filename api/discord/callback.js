// Vercel serverless entry for /api/discord/callback (implementation in _callback.cjs to avoid path conflict)
const mod = require("./_callback.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
