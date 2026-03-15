// POST /api/airdrop/x-unlink — unlink X account for the current user. Body: { discordId } or { walletAddress }
const { sql, setCors, json } = require("../slots-helpers.cjs");
const { readBody } = require("../readBody.cjs");

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!sql) return json(res, 500, { error: "Database not configured" });

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

  if (!discordId && !walletAddress) {
    return json(res, 400, { error: "Provide discordId or walletAddress" });
  }

  try {
    let userId = null;
    if (discordId) {
      const rows = await sql`SELECT id FROM users WHERE discord_id = ${discordId}`;
      if (rows[0]) userId = rows[0].id;
    }
    if (!userId && walletAddress) {
      try {
        const { PublicKey } = require("@solana/web3.js");
        new PublicKey(walletAddress);
      } catch (_) {
        return json(res, 400, { error: "Invalid wallet address format" });
      }
      const rows = await sql`
        SELECT user_id AS id FROM user_wallets WHERE wallet_address = ${walletAddress}
      `;
      if (rows[0]) userId = rows[0].id;
    }
    if (!userId) {
      return json(res, 200, { success: true, unlinked: false, message: "No user found" });
    }
    const result = await sql`
      DELETE FROM user_x_linked WHERE user_id = ${userId} RETURNING user_id
    `;
    const unlinked = Array.isArray(result) && result.length > 0;
    return json(res, 200, { success: true, unlinked, message: unlinked ? "X account unlinked" : "No X link found" });
  } catch (err) {
    console.error("x-unlink error:", err);
    return json(res, 500, { error: "Unlink failed", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
