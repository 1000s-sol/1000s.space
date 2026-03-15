// POST /api/airdrop/claim — body: { walletAddress }
// Marks today's allocation as claimed for the wallet. One claim per day per wallet.
const { sql, setCors, json } = require("../slots-helpers.cjs");
const { readBody } = require("../readBody.cjs");

function getDateET() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

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
  const walletAddress = body?.walletAddress;
  if (!walletAddress) return json(res, 400, { error: "walletAddress is required" });

  try {
    const { PublicKey } = require("@solana/web3.js");
    new PublicKey(walletAddress);
  } catch (_) {
    return json(res, 400, { error: "Invalid wallet address format" });
  }

  const dateEt = getDateET();

  try {
    const existing = await sql`
      SELECT allocation_archive, allocation_casino, allocation_x, allocation_discord, claimed_at
      FROM daily_airdrop_eligibility
      WHERE wallet_address = ${walletAddress} AND date_et = ${dateEt}
    `;
    const row = existing[0];

    if (row?.claimed_at) {
      const total =
        Number(row.allocation_archive || 0) +
        Number(row.allocation_casino || 0) +
        Number(row.allocation_x || 0) +
        Number(row.allocation_discord || 0);
      return json(res, 200, {
        success: true,
        alreadyClaimed: true,
        amount: total,
        message: "Already claimed today",
      });
    }

    if (row) {
      const total =
        Number(row.allocation_archive || 0) +
        Number(row.allocation_casino || 0) +
        Number(row.allocation_x || 0) +
        Number(row.allocation_discord || 0);
      if (total <= 0) {
        return json(res, 400, { error: "No allocation to claim today", totalAllocation: 0 });
      }
      await sql`
        UPDATE daily_airdrop_eligibility
        SET claimed_at = NOW(), updated_at = NOW()
        WHERE wallet_address = ${walletAddress} AND date_et = ${dateEt} AND claimed_at IS NULL
      `;
      return json(res, 200, {
        success: true,
        amount: total,
        message: "Claim recorded. Token distribution may be handled separately.",
      });
    }

    return json(res, 400, {
      error: "No allocation to claim today",
      totalAllocation: 0,
      message: "You have no allocation for today. Complete X and Discord tasks to earn.",
    });
  } catch (err) {
    console.error("Airdrop claim error:", err);
    return json(res, 500, { error: "Claim failed", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
