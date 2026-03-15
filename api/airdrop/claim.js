// Vercel serverless entry for /api/airdrop/claim
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_claim.cjs");
export default typeof mod === "function" ? mod : mod.handler;
