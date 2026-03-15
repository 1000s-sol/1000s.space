// Vercel serverless entry for /api/discord/auth (implementation in _auth.cjs)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_auth.cjs");
export default typeof mod === "function" ? mod : mod.handler;
