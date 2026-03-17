// Slots leaderboard — Neon Postgres
const { sql, setCors, json } = require("./slots-helpers.cjs");

const TOKEN_DECIMALS = 6;

async function handler(req, res) {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") return res.end();

  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  if (!sql) return json(res, 500, { error: "Database not configured" });

  const gameType = (req.query.gameType || "slots").toLowerCase();
  if (gameType !== "slots" && gameType !== "coinflip") return json(res, 400, { error: "gameType must be slots or coinflip" });
  const tokenUsed = (req.query.tokenUsed || "knukl").toString().toLowerCase() === "bux" ? "bux" : "knukl";

  try {
    const sortBy = req.query.sortBy || (gameType === "coinflip" ? "flips" : "spins");
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);

    const validSort = gameType === "coinflip" ? ["flips", "won"] : ["spins", "won", "winRate"];
    if (!validSort.includes(sortBy)) {
      return json(res, 400, { error: `Invalid sortBy. Must be: ${validSort.join(", ")}` });
    }

    if (gameType === "coinflip") {
      let players;
      if (sortBy === "flips") {
        players = await sql`SELECT wallet_address, total_flips, total_won, total_wagered, created_at
          FROM coinflip_players WHERE token_used = ${tokenUsed} AND total_flips > 0 ORDER BY total_flips DESC LIMIT ${limit}`;
      } else {
        players = await sql`SELECT wallet_address, total_flips, total_won, total_wagered, created_at
          FROM coinflip_players WHERE token_used = ${tokenUsed} AND total_flips > 0 ORDER BY total_won DESC LIMIT ${limit}`;
      }
      const leaderboard = (players || []).map((p) => {
        const totalWon = Number(p.total_won || 0) / Math.pow(10, TOKEN_DECIMALS);
        const totalWagered = Number(p.total_wagered || 0) / Math.pow(10, TOKEN_DECIMALS);
        return {
          walletAddress: p.wallet_address,
          displayAddress: `${p.wallet_address.slice(0, 4)}...${p.wallet_address.slice(-4)}`,
          totalFlips: p.total_flips || 0,
          totalWon,
          totalWagered,
          createdAt: p.created_at,
        };
      });
      return json(res, 200, {
        leaderboard: leaderboard.slice(0, limit),
        sortBy,
        totalPlayers: leaderboard.length,
      });
    }

    let players;
    if (sortBy === "spins") {
      players = await sql`SELECT wallet_address, total_spins, total_won, total_wagered, created_at
        FROM slots_players WHERE token_used = ${tokenUsed} AND total_spins > 0 ORDER BY total_spins DESC LIMIT ${limit}`;
    } else if (sortBy === "won") {
      players = await sql`SELECT wallet_address, total_spins, total_won, total_wagered, created_at
        FROM slots_players WHERE token_used = ${tokenUsed} AND total_spins > 0 ORDER BY total_won DESC LIMIT ${limit}`;
    } else {
      players = await sql`SELECT wallet_address, total_spins, total_won, total_wagered, created_at
        FROM slots_players WHERE token_used = ${tokenUsed} AND total_spins > 0 ORDER BY total_spins DESC LIMIT ${limit}`;
    }

    const leaderboard = (players || []).map((p) => {
      const totalWon = Number(p.total_won || 0) / Math.pow(10, TOKEN_DECIMALS);
      const totalWagered = Number(p.total_wagered || 0) / Math.pow(10, TOKEN_DECIMALS);
      const winRate = totalWagered > 0 ? (totalWon / totalWagered) * 100 : 0;
      return {
        walletAddress: p.wallet_address,
        displayAddress: `${p.wallet_address.slice(0, 4)}...${p.wallet_address.slice(-4)}`,
        totalSpins: p.total_spins || 0,
        totalWon,
        totalWagered,
        winRate,
        createdAt: p.created_at,
      };
    });

    if (sortBy === "winRate") leaderboard.sort((a, b) => b.winRate - a.winRate);

    return json(res, 200, {
      leaderboard: leaderboard.slice(0, limit),
      sortBy,
      totalPlayers: leaderboard.length,
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return json(res, 500, { error: "Failed to load leaderboard", message: err.message });
  }
}

module.exports = { handler };
