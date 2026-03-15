// Vercel serverless entry for /api/user/link-wallet
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_link-wallet.cjs");
export default typeof mod === "function" ? mod : mod.handler;
