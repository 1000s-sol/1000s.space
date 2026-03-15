// Vercel serverless entry for /api/user/me
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mod = require("./_me.cjs");
export default typeof mod === "function" ? mod : mod.handler;
