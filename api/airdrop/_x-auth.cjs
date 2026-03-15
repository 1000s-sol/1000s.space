// GET /api/airdrop/x-auth?discordId=... or ?walletAddress=...
// Redirects to X OAuth 2.0 with PKCE. Links X to Discord user (user_id). One X per Discord ID.
const crypto = require("crypto");
const { sql, setCors, json } = require("../slots-helpers.cjs");

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const SCOPE = "users.read tweet.read follows.read like.read";
const CODE_CHALLENGE_METHOD = "S256";

function base64UrlEncode(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const discordId = req.query?.discordId?.trim() || null;
  const walletAddress = req.query?.walletAddress?.trim() || null;

  if (!discordId && !walletAddress) {
    return json(res, 400, { error: "discordId or walletAddress query parameter is required" });
  }

  const clientId = process.env.X_CLIENT_ID;
  const host = (req.headers?.host || "").toLowerCase();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const redirectUri = isLocal && process.env.X_REDIRECT_URI_DEV
    ? process.env.X_REDIRECT_URI_DEV
    : process.env.X_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return json(res, 500, { error: "X OAuth not configured", message: "Set X_CLIENT_ID and X_REDIRECT_URI" + (isLocal ? " (and X_REDIRECT_URI_DEV for dev)" : "") });
  }

  if (!sql) return json(res, 500, { error: "Database not configured" });

  let userId = null;
  if (discordId) {
    const rows = await sql`SELECT id FROM users WHERE discord_id = ${discordId}`;
    if (!rows[0]) {
      return json(res, 400, { error: "Discord user not found. Log in with Discord first." });
    }
    userId = rows[0].id;
  } else {
    try {
      const { PublicKey } = require("@solana/web3.js");
      new PublicKey(walletAddress);
    } catch (_) {
      return json(res, 400, { error: "Invalid wallet address format" });
    }
    const rows = await sql`
      SELECT user_id AS id FROM user_wallets WHERE wallet_address = ${walletAddress}
    `;
    if (!rows[0]) {
      return json(res, 400, { error: "Wallet not linked to a Discord user. Log in with Discord first." });
    }
    userId = rows[0].id;
  }

  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest());
  const state = base64UrlEncode(crypto.randomBytes(16));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CODE_CHALLENGE_METHOD,
  });

  try {
    await sql`
      INSERT INTO oauth_pending (state, user_id, code_verifier)
      VALUES (${state}, ${userId}, ${codeVerifier})
    `;
    res.writeHead(302, { Location: `${X_AUTHORIZE_URL}?${params.toString()}` });
    res.end();
  } catch (e) {
    console.error("x-auth: insert oauth_pending", e);
    json(res, 500, { error: "Failed to start OAuth" });
  }
}

module.exports = handler;
module.exports.handler = handler;
