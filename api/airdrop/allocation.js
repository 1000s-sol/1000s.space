// Vercel serverless entry for /api/airdrop/allocation
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_allocation.cjs");
export default typeof mod === "function" ? mod : mod.handler;
