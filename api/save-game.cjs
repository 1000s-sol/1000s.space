// Save slots game data (purchase or spin) — Neon Postgres
const { sql, setCors, json } = require("./slots-helpers.cjs");

async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!sql) return json(res, 500, { error: "Database not configured" });

  try {
    const {
      walletAddress,
      spinCost,
      resultSymbols,
      wonAmount,
      updateUnclaimedRewards,
      updateSpinsRemaining,
      spinsPurchased,
      gameType = "slots",
      tokenUsed,
      token,
    } = req.body;

    const tokenUsedNorm = (tokenUsed || token || "knukl").toLowerCase() === "bux" ? "bux" : "knukl";

    if (gameType !== "slots") return json(res, 400, { error: "Only gameType=slots supported" });
    if (!walletAddress) return json(res, 400, { error: "walletAddress is required" });

    try {
      const { PublicKey } = require("@solana/web3.js");
      new PublicKey(walletAddress);
    } catch (_) {
      return json(res, 400, { error: "Invalid wallet address format" });
    }

    const now = new Date().toISOString();
    const existing = await sql`SELECT wallet_address FROM players WHERE wallet_address = ${walletAddress}`;
    const existingPlayer = existing[0];

    let total_spins, total_wagered, total_won, unclaimed_rewards, spins_remaining, cost_per_spin, created_at;
    let tokenForHistory = tokenUsedNorm;

    if (!existingPlayer) {
      created_at = now;
      total_spins = 1;
      total_wagered = BigInt(Math.floor((spinCost || 0) * 1e6)).toString();
      total_won = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
      unclaimed_rewards = updateUnclaimedRewards
        ? BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString()
        : BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
      spins_remaining = spinsPurchased !== undefined && spinsPurchased > 0 ? spinsPurchased : 0;
      cost_per_spin = spinCost && spinCost > 0 ? Math.floor(spinCost) : 100;

      await sql`INSERT INTO players (wallet_address, total_spins, total_wagered, total_won, unclaimed_rewards, spins_remaining, cost_per_spin, token_used, created_at, updated_at)
        VALUES (${walletAddress}, ${total_spins}, ${total_wagered}, ${total_won}, ${unclaimed_rewards}, ${spins_remaining}, ${cost_per_spin}, ${tokenUsedNorm}, ${created_at}, ${now})`;

      if (spinsPurchased !== undefined && spinsPurchased > 0) {
        const totalCostRaw = BigInt(Math.floor((cost_per_spin * spinsPurchased) * 1e6)).toString();
        await sql`INSERT INTO slots_purchases (wallet_address, token_used, cost_per_spin, num_spins, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_spin}, ${spinsPurchased}, ${totalCostRaw})`;
      }
    } else {
      const cur = await sql`SELECT total_spins, total_won, total_wagered, unclaimed_rewards, spins_remaining, cost_per_spin, token_used FROM players WHERE wallet_address = ${walletAddress}`;
      const c = cur[0];
      if (!c) return json(res, 500, { error: "Player not found after select" });

      total_spins = c.total_spins || 0;
      total_wagered = (c.total_wagered || 0).toString();
      total_won = (c.total_won || 0).toString();
      unclaimed_rewards = (c.unclaimed_rewards || "0").toString();
      spins_remaining = c.spins_remaining || 0;
      cost_per_spin = c.cost_per_spin ?? 100;
      const currentTokenUsed = c.token_used || "knukl";
      if (!(spinsPurchased !== undefined && spinsPurchased > 0)) tokenForHistory = currentTokenUsed;

      if (spinsPurchased !== undefined && spinsPurchased > 0) {
        if (spins_remaining > 0) {
          return json(res, 400, {
            error: "Cannot purchase spins while spins are remaining. Use existing spins first.",
            spinsRemaining: spins_remaining,
          });
        }
        spins_remaining = spins_remaining + spinsPurchased;
        cost_per_spin = spinCost && spinCost > 0 ? Math.floor(spinCost) : 100;
        const totalCostRaw = BigInt(Math.floor((cost_per_spin * spinsPurchased) * 1e6)).toString();
        await sql`INSERT INTO slots_purchases (wallet_address, token_used, cost_per_spin, num_spins, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_spin}, ${spinsPurchased}, ${totalCostRaw})`;
      } else if (updateSpinsRemaining !== undefined) {
        const storedCost = c.cost_per_spin || 100;
        total_spins = total_spins + 1;
        spins_remaining = updateSpinsRemaining;
        total_wagered = (BigInt(total_wagered) + BigInt(Math.floor(storedCost * 1e6))).toString();
        total_won = (BigInt(total_won) + BigInt(Math.floor((wonAmount || 0) * 1e6))).toString();
        if (updateSpinsRemaining === 0) cost_per_spin = null;
      } else if (spinCost > 0) {
        const storedCost = c.cost_per_spin || 100;
        total_spins = total_spins + 1;
        spins_remaining = Math.max(0, spins_remaining - 1);
        total_wagered = (BigInt(total_wagered) + BigInt(Math.floor(storedCost * 1e6))).toString();
        total_won = (BigInt(total_won) + BigInt(Math.floor((wonAmount || 0) * 1e6))).toString();
        if (spins_remaining === 0) cost_per_spin = null;
      }

      if (updateUnclaimedRewards !== undefined) {
        unclaimed_rewards = BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString();
      } else if (wonAmount > 0) {
        unclaimed_rewards = (BigInt(unclaimed_rewards) + BigInt(Math.floor(wonAmount * 1e6))).toString();
      }

      const tokenToStore = spinsPurchased !== undefined && spinsPurchased > 0 ? tokenUsedNorm : currentTokenUsed;
      await sql`UPDATE players SET total_spins = ${total_spins}, total_wagered = ${total_wagered}, total_won = ${total_won}, unclaimed_rewards = ${unclaimed_rewards}, spins_remaining = ${spins_remaining}, cost_per_spin = ${cost_per_spin}, token_used = ${tokenToStore}, updated_at = ${now} WHERE wallet_address = ${walletAddress}`;
    }

    const resultSymbolsArr = Array.isArray(resultSymbols) ? resultSymbols : [];
    if (resultSymbolsArr.length > 0) {
      const spinCostRaw = BigInt(Math.floor((spinCost || 0) * 1e6)).toString();
      const wonAmountRaw = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
      await sql`INSERT INTO game_history (wallet_address, spin_cost, result_symbols, won_amount, token_used, timestamp)
        VALUES (${walletAddress}, ${spinCostRaw}, ${resultSymbolsArr}, ${wonAmountRaw}, ${tokenForHistory}, ${now})`;
    }

    return json(res, 200, { success: true, message: "Game data saved successfully" });
  } catch (err) {
    console.error("Save game error:", err);
    return json(res, 500, { error: "Failed to save game data", message: err.message });
  }
}

module.exports = { handler };
