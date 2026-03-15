// POST /api/user/link-wallet — link wallet to Discord user (user_wallets). Body: { discordId, walletAddress }
const { sql, setCors, json, formatDbConnectionErr } = require("../slots-helpers.cjs");
const { readBody } = require("../readBody.cjs");

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  let body = req.body;
  if (body == null) {
    try {
      body = await readBody(req);
    } catch (e) {
      return json(res, 400, { error: "Invalid request body" });
    }
  }
  const discordId = body?.discordId?.trim() || null;
  const walletAddress = body?.walletAddress?.trim() || null;

  if (!discordId || !walletAddress) {
    return json(res, 400, { error: "discordId and walletAddress are required" });
  }
  if (!sql) return json(res, 500, { error: "Database not configured" });

  try {
    const { PublicKey } = require("@solana/web3.js");
    new PublicKey(walletAddress);
  } catch (_) {
    return json(res, 400, { error: "Invalid wallet address format" });
  }

  try {
    const userRows = await sql`SELECT id FROM users WHERE discord_id = ${discordId}`;
    if (!userRows[0]) {
      return json(res, 404, { error: "Discord user not found. Log in with Discord first." });
    }
    const userId = userRows[0].id;

    await sql`
      INSERT INTO user_wallets (wallet_address, user_id)
      VALUES (${walletAddress}, ${userId})
      ON CONFLICT (wallet_address) DO UPDATE SET user_id = ${userId}
    `;

    return json(res, 200, { success: true, message: "Wallet linked to your account" });
  } catch (err) {
    const short = formatDbConnectionErr(err);
    console.error("link-wallet error:", short || err.message || err);
    return json(res, 500, { error: "Failed to link wallet", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
