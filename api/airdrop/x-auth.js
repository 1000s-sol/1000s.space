// Vercel serverless entry for /api/airdrop/x-auth
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_x-auth.cjs");
export default typeof mod === "function" ? mod : mod.handler;
