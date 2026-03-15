// GET /api/user/me?discordId=... or ?walletAddress=...
// Returns current user (by Discord or wallet) and X link status. Used to show X status with or without wallet.
const { sql, setCors, json, formatDbConnectionErr } = require("../slots-helpers.cjs");

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
    let discordIdOut = null;
    let discordUsername = null;
    let discordAvatarOut = null;

    if (discordId) {
      const rows = await sql`
        SELECT id, discord_id, discord_username, discord_avatar FROM users WHERE discord_id = ${discordId}
      `;
      const r = rows[0];
      if (r) {
        userId = r.id;
        discordIdOut = r.discord_id;
        discordUsername = r.discord_username;
        discordAvatarOut = r.discord_avatar;
      } else {
        return json(res, 200, { user: null, xLinked: false, xUsername: null });
      }
    }

    if (!userId && walletAddress) {
      try {
        const { PublicKey } = require("@solana/web3.js");
        new PublicKey(walletAddress);
      } catch (_) {
        return json(res, 400, { error: "Invalid wallet address format" });
      }
      const rows = await sql`
        SELECT u.id, u.discord_id, u.discord_username, u.discord_avatar
        FROM user_wallets w
        JOIN users u ON u.id = w.user_id
        WHERE w.wallet_address = ${walletAddress}
      `;
      const r = rows[0];
      if (r) {
        userId = r.id;
        discordIdOut = r.discord_id;
        discordUsername = r.discord_username;
        discordAvatarOut = r.discord_avatar;
      } else {
        return json(res, 200, { user: null, xLinked: false, xUsername: null });
      }
    }

    if (!userId) {
      return json(res, 200, { user: null, xLinked: false, xUsername: null });
    }

    const xRows = await sql`
      SELECT x_user_id, x_username, linked_at FROM user_x_linked WHERE user_id = ${userId}
    `;
    const xRow = xRows[0];

    return json(res, 200, {
      user: { userId, discordId: discordIdOut, discordUsername, discordAvatar: discordAvatarOut },
      xLinked: !!xRow,
      xUsername: xRow?.x_username ?? null,
      xLinkedAt: xRow?.linked_at ?? null,
    });
  } catch (err) {
    const short = formatDbConnectionErr(err);
    console.error("user/me error:", short || err.message || err);
    return json(res, 500, { error: "Failed to get user", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
