// Vercel serverless entry for /api/airdrop/x-unlink
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_x-unlink.cjs");
export default typeof mod === "function" ? mod : mod.handler;
