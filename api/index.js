// Single Vercel serverless function for discord, airdrop, and user routes (stays under 12-function limit)
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const readBody = require(path.join(__dirname, "readBody.cjs")).readBody;

// __r is set by vercel.json rewrites (e.g. discord/auth, airdrop/x-auth)
const ROUTES = {
  "GET discord/auth": "discord/_auth.cjs",
  "GET discord/callback": "discord/_callback.cjs",
  "GET airdrop/allocation": "airdrop/_allocation.cjs",
  "POST airdrop/claim": "airdrop/_claim.cjs",
  "GET airdrop/x-auth": "airdrop/_x-auth.cjs",
  "GET airdrop/x-callback": "airdrop/_x-callback.cjs",
  "POST airdrop/x-unlink": "airdrop/_x-unlink.cjs",
  "GET airdrop/x-status": "airdrop/_x-status.cjs",
  "GET user/me": "user/_me.cjs",
  "POST user/link-wallet": "user/_link-wallet.cjs",
};

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  req.query = Object.fromEntries(url.searchParams);
  const route = (req.query.__r || "").replace(/^\/+|\/+$/g, "");
  const key = `${req.method || "GET"} ${route}`;
  const modulePath = ROUTES[key];
  if (!modulePath) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found", code: "NOT_FOUND" }));
    return;
  }
  delete req.query.__r;
  try {
    if (req.method === "POST" && (modulePath.includes("_claim") || modulePath.includes("_link-wallet"))) {
      req.body = await readBody(req);
    }
    const mod = require(path.join(__dirname, modulePath));
    const fn = typeof mod === "function" ? mod : mod.handler;
    await fn(req, res);
  } catch (e) {
    console.error(route, e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Server error", message: e?.message || String(e) }));
  }
}
