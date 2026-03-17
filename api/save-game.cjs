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
      // coinflip
      flipsPurchased,
      updateFlipsRemaining,
      flipCost,
      choice,
      result,
      // roulette
      chipsPurchased,
      costPerChip,
      updateChipsBalance,
    } = req.body;

    const tokenUsedNorm = (tokenUsed || token || "knukl").toLowerCase() === "bux" ? "bux" : "knukl";
    const gameTypeNorm = (gameType || "slots").toLowerCase();

    if (gameTypeNorm !== "slots" && gameTypeNorm !== "coinflip" && gameTypeNorm !== "roulette") return json(res, 400, { error: "gameType must be slots, coinflip, or roulette" });
    if (!walletAddress) return json(res, 400, { error: "walletAddress is required" });

    try {
      const { PublicKey } = require("@solana/web3.js");
      new PublicKey(walletAddress);
    } catch (_) {
      return json(res, 400, { error: "Invalid wallet address format" });
    }

    const now = new Date().toISOString();

    if (gameTypeNorm === "coinflip") {
      const existing = await sql`SELECT wallet_address FROM coinflip_players WHERE wallet_address = ${walletAddress}`;
      const existingPlayer = existing[0];

      let total_flips, total_wagered, total_won, unclaimed_rewards, flips_remaining, cost_per_flip, created_at;

      if (!existingPlayer) {
        created_at = now;
        total_flips = (choice && result) ? 1 : 0;
        total_wagered = BigInt(Math.floor((flipCost || 0) * 1e6)).toString();
        total_won = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
        unclaimed_rewards = updateUnclaimedRewards
          ? BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString()
          : BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
        flips_remaining = flipsPurchased !== undefined && flipsPurchased > 0 ? flipsPurchased : 0;
        cost_per_flip = (flipCost && flipCost > 0) || (flipsPurchased !== undefined && flipsPurchased > 0)
          ? Math.floor(flipCost || 100)
          : 100;

        await sql`INSERT INTO coinflip_players (wallet_address, total_flips, total_wagered, total_won, unclaimed_rewards, flips_remaining, cost_per_flip, token_used, created_at, updated_at)
          VALUES (${walletAddress}, ${total_flips}, ${total_wagered}, ${total_won}, ${unclaimed_rewards}, ${flips_remaining}, ${cost_per_flip}, ${tokenUsedNorm}, ${created_at}, ${now})`;

        if (flipsPurchased !== undefined && flipsPurchased > 0) {
          const totalCostRaw = BigInt(Math.floor((cost_per_flip * flipsPurchased) * 1e6)).toString();
          await sql`INSERT INTO coinflip_purchases (wallet_address, token_used, cost_per_flip, num_flips, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_flip}, ${flipsPurchased}, ${totalCostRaw})`;
        }
      } else {
        const cur = await sql`SELECT total_flips, total_won, total_wagered, unclaimed_rewards, flips_remaining, cost_per_flip, token_used FROM coinflip_players WHERE wallet_address = ${walletAddress}`;
        const c = cur[0];
        if (!c) return json(res, 500, { error: "Player not found after select" });

        total_flips = c.total_flips || 0;
        total_wagered = (c.total_wagered || 0).toString();
        total_won = (c.total_won || 0).toString();
        unclaimed_rewards = (c.unclaimed_rewards || "0").toString();
        flips_remaining = c.flips_remaining || 0;
        cost_per_flip = c.cost_per_flip ?? 100;
        const currentTokenUsed = c.token_used || "knukl";

        if (flipsPurchased !== undefined && flipsPurchased > 0) {
          if (flips_remaining > 0) {
            return json(res, 400, {
              error: "Cannot purchase flips while flips are remaining. Use existing flips first.",
              flipsRemaining: flips_remaining,
            });
          }
          flips_remaining = flips_remaining + flipsPurchased;
          cost_per_flip = flipCost && flipCost > 0 ? Math.floor(flipCost) : 100;
          const totalCostRaw = BigInt(Math.floor((cost_per_flip * flipsPurchased) * 1e6)).toString();
          await sql`INSERT INTO coinflip_purchases (wallet_address, token_used, cost_per_flip, num_flips, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_flip}, ${flipsPurchased}, ${totalCostRaw})`;
        } else if (updateFlipsRemaining !== undefined && (choice && result)) {
          const storedCost = c.cost_per_flip || 100;
          total_flips = total_flips + 1;
          flips_remaining = updateFlipsRemaining;
          total_wagered = (BigInt(total_wagered) + BigInt(Math.floor(storedCost * 1e6))).toString();
          total_won = (BigInt(total_won) + BigInt(Math.floor((wonAmount || 0) * 1e6))).toString();
          if (updateFlipsRemaining === 0) cost_per_flip = null;
        }

        if (updateUnclaimedRewards !== undefined) {
          unclaimed_rewards = BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString();
        } else if (wonAmount > 0) {
          unclaimed_rewards = (BigInt(unclaimed_rewards) + BigInt(Math.floor(wonAmount * 1e6))).toString();
        }

        const tokenToStore = flipsPurchased !== undefined && flipsPurchased > 0 ? tokenUsedNorm : currentTokenUsed;
        await sql`UPDATE coinflip_players SET total_flips = ${total_flips}, total_wagered = ${total_wagered}, total_won = ${total_won}, unclaimed_rewards = ${unclaimed_rewards}, flips_remaining = ${flips_remaining}, cost_per_flip = ${cost_per_flip}, token_used = ${tokenToStore}, updated_at = ${now} WHERE wallet_address = ${walletAddress}`;
      }

      if (choice && result) {
        const flipCostRaw = BigInt(Math.floor((flipCost || 0) * 1e6)).toString();
        const wonAmountRaw = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
        await sql`INSERT INTO coinflip_game_history (wallet_address, flip_cost, choice, result, won_amount, token_used, timestamp)
          VALUES (${walletAddress}, ${flipCostRaw}, ${choice}, ${result}, ${wonAmountRaw}, ${tokenUsedNorm}, ${now})`;
      }

      return json(res, 200, { success: true, message: "Game data saved successfully" });
    }

    if (gameTypeNorm === "roulette") {
      const existing = await sql`SELECT wallet_address FROM roulette_players WHERE wallet_address = ${walletAddress}`;
      const existingPlayer = existing[0];
      const nowR = new Date().toISOString();
      let total_spins_r, total_wagered_r, total_won_r, unclaimed_rewards_r, chips_balance_r, cost_per_chip_r, created_at_r;

      if (!existingPlayer) {
        created_at_r = nowR;
        total_spins_r = resultSymbols && resultSymbols.length > 0 ? 1 : 0;
        total_wagered_r = BigInt(Math.floor((spinCost || 0) * 1e6)).toString();
        total_won_r = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
        unclaimed_rewards_r = updateUnclaimedRewards !== undefined ? BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString() : BigInt(0).toString();
        chips_balance_r = chipsPurchased !== undefined && chipsPurchased > 0 ? chipsPurchased : (updateChipsBalance !== undefined ? Math.max(0, Math.floor(updateChipsBalance)) : 0);
        cost_per_chip_r = (costPerChip && costPerChip > 0) || (chipsPurchased > 0) ? Math.floor(costPerChip || 100) : 100;
        await sql`INSERT INTO roulette_players (wallet_address, total_spins, total_wagered, total_won, unclaimed_rewards, chips_balance, cost_per_chip, token_used, created_at, updated_at)
          VALUES (${walletAddress}, ${total_spins_r}, ${total_wagered_r}, ${total_won_r}, ${unclaimed_rewards_r}, ${chips_balance_r}, ${cost_per_chip_r}, ${tokenUsedNorm}, ${created_at_r}, ${nowR})`;
        if (chipsPurchased !== undefined && chipsPurchased > 0) {
          const totalCostRaw = BigInt(Math.floor((cost_per_chip_r * chipsPurchased) * 1e6)).toString();
          await sql`INSERT INTO roulette_purchases (wallet_address, token_used, cost_per_chip, num_chips, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_chip_r}, ${chipsPurchased}, ${totalCostRaw})`;
        }
      } else {
        const cur = await sql`SELECT total_spins, total_won, total_wagered, unclaimed_rewards, chips_balance, cost_per_chip, token_used FROM roulette_players WHERE wallet_address = ${walletAddress}`;
        const c = cur[0];
        if (!c) return json(res, 500, { error: "Player not found" });
        total_spins_r = c.total_spins || 0;
        total_wagered_r = (c.total_wagered || 0).toString();
        total_won_r = (c.total_won || 0).toString();
        unclaimed_rewards_r = (c.unclaimed_rewards || "0").toString();
        chips_balance_r = c.chips_balance || 0;
        cost_per_chip_r = c.cost_per_chip ?? 100;
        const currentToken = c.token_used || "knukl";

        if (chipsPurchased !== undefined && chipsPurchased > 0) {
          if (chips_balance_r > 0) return json(res, 400, { error: "Use or collect chips before buying more.", chipsBalance: chips_balance_r });
          chips_balance_r = chips_balance_r + chipsPurchased;
          cost_per_chip_r = costPerChip && costPerChip > 0 ? Math.floor(costPerChip) : 100;
          const totalCostRaw = BigInt(Math.floor((cost_per_chip_r * chipsPurchased) * 1e6)).toString();
          await sql`INSERT INTO roulette_purchases (wallet_address, token_used, cost_per_chip, num_chips, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_chip_r}, ${chipsPurchased}, ${totalCostRaw})`;
        } else if (updateChipsBalance !== undefined) {
          chips_balance_r = Math.max(0, Math.floor(updateChipsBalance));
          if (resultSymbols && resultSymbols.length > 0) {
            total_spins_r = total_spins_r + 1;
            const stakeRaw = BigInt(Math.floor((spinCost || c.cost_per_chip || 100) * 1e6));
            total_wagered_r = (BigInt(total_wagered_r) + stakeRaw).toString();
            total_won_r = (BigInt(total_won_r) + BigInt(Math.floor((wonAmount || 0) * 1e6))).toString();
          }
        }
        if (updateUnclaimedRewards !== undefined) unclaimed_rewards_r = BigInt(Math.floor(updateUnclaimedRewards * 1e6)).toString();
        else if (wonAmount > 0) unclaimed_rewards_r = (BigInt(unclaimed_rewards_r) + BigInt(Math.floor(wonAmount * 1e6))).toString();
        const tokenToStore = (chipsPurchased !== undefined && chipsPurchased > 0) ? tokenUsedNorm : currentToken;
        await sql`UPDATE roulette_players SET total_spins = ${total_spins_r}, total_wagered = ${total_wagered_r}, total_won = ${total_won_r}, unclaimed_rewards = ${unclaimed_rewards_r}, chips_balance = ${chips_balance_r}, cost_per_chip = ${cost_per_chip_r}, token_used = ${tokenToStore}, updated_at = ${nowR} WHERE wallet_address = ${walletAddress}`;
      }
      if (resultSymbols && resultSymbols.length > 0) {
        const resultNumber = String(resultSymbols[0]);
        const spinCostRaw = BigInt(Math.floor((spinCost || 0) * 1e6)).toString();
        const wonAmountRaw = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
        await sql`INSERT INTO roulette_game_history (wallet_address, spin_cost, result_number, won_amount, token_used, timestamp)
          VALUES (${walletAddress}, ${spinCostRaw}, ${resultNumber}, ${wonAmountRaw}, ${tokenUsedNorm}, ${nowR})`;
      }
      return json(res, 200, { success: true, message: "Game data saved successfully" });
    }

    const existing = await sql`SELECT wallet_address FROM slots_players WHERE wallet_address = ${walletAddress}`;
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

      await sql`INSERT INTO slots_players (wallet_address, total_spins, total_wagered, total_won, unclaimed_rewards, spins_remaining, cost_per_spin, token_used, created_at, updated_at)
        VALUES (${walletAddress}, ${total_spins}, ${total_wagered}, ${total_won}, ${unclaimed_rewards}, ${spins_remaining}, ${cost_per_spin}, ${tokenUsedNorm}, ${created_at}, ${now})`;

      if (spinsPurchased !== undefined && spinsPurchased > 0) {
        const totalCostRaw = BigInt(Math.floor((cost_per_spin * spinsPurchased) * 1e6)).toString();
        await sql`INSERT INTO slots_purchases (wallet_address, token_used, cost_per_spin, num_spins, total_cost_raw) VALUES (${walletAddress}, ${tokenUsedNorm}, ${cost_per_spin}, ${spinsPurchased}, ${totalCostRaw})`;
      }
    } else {
      const cur = await sql`SELECT total_spins, total_won, total_wagered, unclaimed_rewards, spins_remaining, cost_per_spin, token_used FROM slots_players WHERE wallet_address = ${walletAddress}`;
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
      await sql`UPDATE slots_players SET total_spins = ${total_spins}, total_wagered = ${total_wagered}, total_won = ${total_won}, unclaimed_rewards = ${unclaimed_rewards}, spins_remaining = ${spins_remaining}, cost_per_spin = ${cost_per_spin}, token_used = ${tokenToStore}, updated_at = ${now} WHERE wallet_address = ${walletAddress}`;
    }

    const resultSymbolsArr = Array.isArray(resultSymbols) ? resultSymbols : [];
    if (resultSymbolsArr.length > 0) {
      const spinCostRaw = BigInt(Math.floor((spinCost || 0) * 1e6)).toString();
      const wonAmountRaw = BigInt(Math.floor((wonAmount || 0) * 1e6)).toString();
      await sql`INSERT INTO slots_game_history (wallet_address, spin_cost, result_symbols, won_amount, token_used, timestamp)
        VALUES (${walletAddress}, ${spinCostRaw}, ${resultSymbolsArr}, ${wonAmountRaw}, ${tokenForHistory}, ${now})`;
    }

    return json(res, 200, { success: true, message: "Game data saved successfully" });
  } catch (err) {
    console.error("Save game error:", err);
    return json(res, 500, { error: "Failed to save game data", message: err.message });
  }
}

module.exports = { handler };
