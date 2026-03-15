// Single Vercel serverless function for discord, airdrop, and user routes (stays under 12-function limit)
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const readBody = require("./readBody.cjs").readBody;

// Static requires (literal paths) so Vercel's bundler includes all handler modules and their deps
const handlers = {
  "GET discord/auth": require("./discord/_auth.cjs"),
  "GET discord/callback": require("./discord/_callback.cjs"),
  "GET airdrop/allocation": require("./airdrop/_allocation.cjs"),
  "POST airdrop/claim": require("./airdrop/_claim.cjs"),
  "GET airdrop/x-auth": require("./airdrop/_x-auth.cjs"),
  "GET airdrop/x-callback": require("./airdrop/_x-callback.cjs"),
  "POST airdrop/x-unlink": require("./airdrop/_x-unlink.cjs"),
  "GET airdrop/x-status": require("./airdrop/_x-status.cjs"),
  "GET user/me": require("./user/_me.cjs"),
  "POST user/link-wallet": require("./user/_link-wallet.cjs"),
};

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  req.query = Object.fromEntries(url.searchParams);
  const route = (req.query.__r || "").replace(/^\/+|\/+$/g, "");
  const key = `${req.method || "GET"} ${route}`;
  delete req.query.__r;
  const mod = handlers[key];
  if (!mod) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found", code: "NOT_FOUND" }));
    return;
  }
  const fn = typeof mod === "function" ? mod : mod.handler;
  try {
    if (req.method === "POST" && (key.includes("claim") || key.includes("link-wallet"))) {
      req.body = await readBody(req);
    }
    await fn(req, res);
  } catch (e) {
    console.error(route, e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Server error", message: e?.message || String(e) }));
  }
}
