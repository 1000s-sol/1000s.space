// Vercel serverless entry for /api/discord/auth (implementation in _auth.cjs to avoid path conflict)
const mod = require("./_auth.cjs");
module.exports = typeof mod === "function" ? mod : mod.handler;
