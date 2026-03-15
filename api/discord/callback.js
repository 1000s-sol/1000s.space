// Vercel serverless entry for /api/discord/callback (implementation in _callback.cjs)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_callback.cjs");
export default typeof mod === "function" ? mod : mod.handler;
