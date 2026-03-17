// GET /api/airdrop/allocation?walletAddress=...
// Returns daily allocation for a wallet (archive from chain, casino/x/discord from DB) and claim status.
// Archive = sum over collections of (NFT count × multiplier). Upserts daily_airdrop_eligibility so claim has a row.
const { sql, setCors, json, formatDbConnectionErr } = require("../slots-helpers.cjs");
const {
  getWalletCollectionCounts,
  getArchiveAllocationMultipliers,
} = require("../_lib.cjs");
const { getXFollowedAccounts, TARGET_USERNAMES } = require("./x-following.cjs");
const { getXEngagement } = require("./x-engagement.cjs");
const { refreshXToken } = require("./x-refresh-token.cjs");

/** Display names for archive breakdown (as requested for UI). */
const ARCHIVE_DISPLAY_NAMES = {
  kbds_og: "KBDS OG",
  kbds_art: "KBDS Art",
  kbds_yotr: "KBDS YOTR",
  kbds_pinups: "KBDS Pinups",
  fcked_catz: "Fcked Catz",
  celebcatz: "Celeb Catz",
  money_monsters: "Money Monsters",
  moneymonsters3d: "Money Monsters 3D",
  ai_bitbots: "A.I. BitBots",
};

function getDateET() {
  return new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function normToken(token) {
  return (token != null && String(token).toLowerCase() === "bux") ? "bux" : "knukl";
}

function calcCasinoAllocation(plays, spentTokens) {
  const base = plays > 0 ? 10 : 0;
  const spendBonus = Math.floor((spentTokens || 0) / 500) * 10;
  return base + spendBonus;
}

async function handler(req, res) {
  setCors(res, req.headers?.origin);
  if (req.method === "OPTIONS") return res.end();
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  if (!sql) return json(res, 500, { error: "Database not configured" });

  const walletAddress = req.query?.walletAddress?.trim();
  if (!walletAddress) return json(res, 400, { error: "walletAddress query parameter is required" });

  try {
    const { PublicKey } = require("@solana/web3.js");
    new PublicKey(walletAddress);
  } catch (_) {
    return json(res, 400, { error: "Invalid wallet address format" });
  }

  const dateEt = getDateET();

  try {
    const multipliers = getArchiveAllocationMultipliers();
    const counts = await getWalletCollectionCounts(walletAddress);
    let archiveTotal = 0;
    const archiveBreakdown = [];
    for (const [slug, multiplier] of Object.entries(multipliers)) {
      const count = counts[slug] || 0;
      const allocation = count * multiplier;
      archiveTotal += allocation;
      archiveBreakdown.push({
        slug,
        name: ARCHIVE_DISPLAY_NAMES[slug] || slug,
        count,
        multiplier,
        allocation,
      });
    }
    archiveBreakdown.sort((a, b) => (b.allocation - a.allocation) || (b.count - a.count));

    let allocationX = 0;
    let xCreditsDepleted = false;
    let xFollowedAccounts = TARGET_USERNAMES.map((u) => ({ username: "@" + u, followed: false }));
    let xEngagement = { likedCount: 0, repostedCount: 0, mentionedCount: 0, allocation: 0, repostUnavailable: false };
    const userWalletRow = (await sql`SELECT user_id FROM user_wallets WHERE wallet_address = ${walletAddress}`)[0];
    if (!userWalletRow?.user_id) {
      console.warn("allocation: no user_id for wallet", walletAddress?.slice(0, 8) + "…");
    } else {
      const xLinkRow = (await sql`
        SELECT access_token, refresh_token, x_user_id FROM user_x_linked WHERE user_id = ${userWalletRow.user_id}
      `)[0];
      if (!xLinkRow?.access_token || !xLinkRow?.x_user_id) {
        console.warn("allocation: no X token for user_id", userWalletRow.user_id);
      } else {
        let accessToken = xLinkRow.access_token;
        let followed = await getXFollowedAccounts(accessToken, xLinkRow.x_user_id);
        if (followed.tokenExpired && xLinkRow.refresh_token) {
          const refreshed = await refreshXToken(xLinkRow.refresh_token);
          if (refreshed) {
            await sql`
              UPDATE user_x_linked SET access_token = ${refreshed.accessToken}, refresh_token = ${refreshed.refreshToken}
              WHERE user_id = ${userWalletRow.user_id}
            `;
            accessToken = refreshed.accessToken;
            followed = await getXFollowedAccounts(accessToken, xLinkRow.x_user_id);
          }
        }
        allocationX = followed.allocation;
        xFollowedAccounts = followed.accounts;
        if (followed.creditsDepleted) xCreditsDepleted = true;
        // Engagement: reward for liking any tweet from our accounts in the last 24h
        let engagement = await getXEngagement(accessToken, xLinkRow.x_user_id);
        if (engagement.tokenExpired && xLinkRow.refresh_token) {
          const refreshed = await refreshXToken(xLinkRow.refresh_token);
          if (refreshed) {
            await sql`
              UPDATE user_x_linked SET access_token = ${refreshed.accessToken}, refresh_token = ${refreshed.refreshToken}
              WHERE user_id = ${userWalletRow.user_id}
            `;
            engagement = await getXEngagement(refreshed.accessToken, xLinkRow.x_user_id);
          }
        }
        xEngagement = {
          likedCount: engagement.likedCount ?? 0,
          repostedCount: engagement.repostedCount ?? 0,
          mentionedCount: engagement.mentionedCount ?? 0,
          allocation: engagement.allocation ?? 0,
          repostUnavailable: engagement.repostUnavailable === true,
        };
        allocationX += xEngagement.allocation;
        if (engagement.creditsDepleted) xCreditsDepleted = true;
      }
    }

    // Casino allocation (previous 24h, token-specific breakdown)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const emptyBreakdown = { slots: 0, coinflip: 0, roulette: 0 };
    const casinoBreakdown = { knukl: { ...emptyBreakdown }, bux: { ...emptyBreakdown } };

    const [slotsAgg, coinflipAgg, rouletteAgg] = await Promise.all([
      sql`SELECT token_used, COUNT(*)::int AS plays, COALESCE(SUM(spin_cost), 0)::bigint AS spent_raw
          FROM slots_game_history
          WHERE wallet_address = ${walletAddress} AND timestamp >= ${since24h}
          GROUP BY token_used`,
      sql`SELECT token_used, COUNT(*)::int AS plays, COALESCE(SUM(flip_cost), 0)::bigint AS spent_raw
          FROM coinflip_game_history
          WHERE wallet_address = ${walletAddress} AND timestamp >= ${since24h}
          GROUP BY token_used`,
      sql`SELECT token_used, COUNT(*)::int AS plays, COALESCE(SUM(spin_cost), 0)::bigint AS spent_raw
          FROM roulette_game_history
          WHERE wallet_address = ${walletAddress} AND timestamp >= ${since24h}
          GROUP BY token_used`,
    ]);

    (slotsAgg || []).forEach((r) => {
      const t = normToken(r.token_used);
      const spent = Number(r.spent_raw || 0) / 1e6;
      casinoBreakdown[t].slots = calcCasinoAllocation(Number(r.plays || 0), spent);
    });
    (coinflipAgg || []).forEach((r) => {
      const t = normToken(r.token_used);
      const spent = Number(r.spent_raw || 0) / 1e6;
      casinoBreakdown[t].coinflip = calcCasinoAllocation(Number(r.plays || 0), spent);
    });
    (rouletteAgg || []).forEach((r) => {
      const t = normToken(r.token_used);
      const spent = Number(r.spent_raw || 0) / 1e6;
      casinoBreakdown[t].roulette = calcCasinoAllocation(Number(r.plays || 0), spent);
    });

    const casino =
      casinoBreakdown.knukl.slots + casinoBreakdown.knukl.coinflip + casinoBreakdown.knukl.roulette +
      casinoBreakdown.bux.slots + casinoBreakdown.bux.coinflip + casinoBreakdown.bux.roulette;

    const rows = await sql`
      SELECT allocation_archive, allocation_casino, allocation_x, allocation_discord, claimed_at
      FROM daily_airdrop_eligibility
      WHERE wallet_address = ${walletAddress} AND date_et = ${dateEt}
    `;
    const row = rows[0];
    // Casino is computed live from previous 24h gameplay. (We still store it in daily_airdrop_eligibility for claims/audit.)
    const discord = row ? Number(row.allocation_discord || 0) : 0;
    const totalAllocation = archiveTotal + casino + allocationX + discord;
    const claimed = row ? row.claimed_at != null : false;
    const claimedAt = row?.claimed_at ?? null;

    await sql`
      INSERT INTO daily_airdrop_eligibility (wallet_address, date_et, allocation_archive, allocation_casino, allocation_x, allocation_discord, updated_at)
      VALUES (${walletAddress}, ${dateEt}, ${archiveTotal}, ${casino}, ${allocationX}, ${discord}, NOW())
      ON CONFLICT (wallet_address, date_et) DO UPDATE SET
        allocation_archive = ${archiveTotal},
        allocation_casino = ${casino},
        allocation_x = ${allocationX},
        updated_at = NOW()
    `;

    return json(res, 200, {
      walletAddress,
      dateEt,
      allocations: { archive: archiveTotal, casino, x: allocationX, discord },
      casinoBreakdown,
      archiveBreakdown,
      xFollowedAccounts,
      xEngagement,
      xCreditsDepleted: xCreditsDepleted || undefined,
      totalAllocation,
      claimed,
      claimedAt,
    });
  } catch (err) {
    const short = formatDbConnectionErr(err);
    console.error("Airdrop allocation error:", short || err.message || err);
    return json(res, 500, { error: "Failed to load allocation", message: err.message });
  }
}

module.exports = handler;
module.exports.handler = handler;
