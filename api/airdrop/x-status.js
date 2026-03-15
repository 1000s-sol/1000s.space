// Vercel serverless entry for /api/airdrop/x-status
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_x-status.cjs");
export default typeof mod === "function" ? mod : mod.handler;
