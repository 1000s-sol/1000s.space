// GET /api/airdrop/x-status?discordId=... or ?walletAddress=...
// Returns linked X account for the Discord user (resolved from discordId or wallet). Works with or without wallet.
const { sql, setCors, json } = require("../slots-helpers.cjs");

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const discordId = req.query?.discordId?.trim() || null;
  const walletAddress = req.query?.walletAddress?.trim() || null;

  if (!discordId && !walletAddress) {
    return json(res, 400, { error: "Provide discordId or walletAddress" });
  }
  if (!sql) return json(res, 500, { error: "Database not configured" });

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
      return json(res, 200, { linked: false, discordId: discordId || undefined, walletAddress: walletAddress || undefined });
    }

    const rows = await sql`
      SELECT x_user_id, x_username, linked_at
      FROM user_x_linked
      WHERE user_id = ${userId}
    `;
    const row = rows[0];
    if (!row) {
      return json(res, 200, { linked: false, userId, discordId: discordId || undefined, walletAddress: walletAddress || undefined });
    }
    return json(res, 200, {
      linked: true,
      userId,
      xUserId: row.x_user_id,
      xUsername: row.x_username ?? null,
      linkedAt: row.linked_at,
    });
  } catch (err) {
    console.error("x-status error:", err);
    return json(res, 500, { error: "Failed to get X status", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
