// Vercel serverless entry for /api/airdrop/x-callback
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_x-callback.cjs");
export default typeof mod === "function" ? mod : mod.handler;
