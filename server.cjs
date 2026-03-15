/**
 * API server for /api/collections, /api/prices, /api/holders.
 * Run: node server.cjs (port 3001). In dev, Vite proxies /api to this server.
 * For holders: set HELIUS_API_KEY and optionally TOKEN_MINT; add collectionMint to collections-config for NFT counts.
 */
try {
  require("dotenv").config();
} catch (e) {
  // dotenv not installed; env from shell only
}
const http = require("http");
const bs58 = require("bs58").default || require("bs58");

const PORT = process.env.API_PORT || 3001;
const ME_BASE = "https://api-mainnet.magiceden.dev/v2";
const LAMPORTS_PER_SOL = 1e9;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC = "https://mainnet.helius-rpc.com";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const BUX_TOKEN_MINT = process.env.BUX_TOKEN_MINT || "";
const KNUKL_TOKEN_MINT = process.env.KNUKL_TOKEN_MINT || "";
const BUX_TOKEN_DECIMALS = parseInt(process.env.BUX_TOKEN_DECIMALS || process.env.TOKEN_DECIMALS || "9", 10);
const KNUKL_TOKEN_DECIMALS = parseInt(process.env.KNUKL_TOKEN_DECIMALS || process.env.TOKEN_DECIMALS || "8", 10);
const SOL_MINT = "So11111111111111111111111111111111111111112";
const PRICES_CACHE_MS = 60 * 1000;
let pricesCache = { data: null, ts: 0 };

function formatTokenAmount(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function decodeTokenAccountFull(dataBase64) {
  if (!dataBase64) return null;
  try {
    const buf = Buffer.from(dataBase64, "base64");
    if (buf.length < 72) return null;
    const owner = bs58.encode(buf.slice(32, 64));
    const amount = buf.readBigUInt64LE(64);
    return { owner, amount: Number(amount) };
  } catch (e) {
    return null;
  }
}

let COLLECTIONS;
try {
  COLLECTIONS = require("./collections-config.cjs");
} catch (e) {
  COLLECTIONS = [
    { slug: "mutant_apes", name: "Xperimental Mutant Apes", group: "Other" },
  ];
}

// Merge collection mints from .env (COLLECTION_<SLUG_UPPERCASE>, e.g. COLLECTION_KBDS_OG)
COLLECTIONS = COLLECTIONS.map((c) => {
  const envKey = "COLLECTION_" + (c.slug || "").toUpperCase().replace(/-/g, "_");
  const mint = process.env[envKey] || c.collectionMint || "";
  return { ...c, collectionMint: mint };
});

async function fetchJson(u) {
  const res = await fetch(u, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json();
}

async function getCollectionData(col) {
  const out = {
    symbol: col.slug,
    name: col.name,
    description: null,
    image: null,
    animationUrl: null,
    supply: null,
    listedCount: null,
    floorPrice: null,
    floorPriceSol: null,
    volumeAll: null,
    volumeAllSol: null,
    avgPrice24hr: null,
    avgPrice24hrSol: null,
    marketplaceUrl: `https://magiceden.io/marketplace/${col.slug}`,
    group: col.group || null,
  };

  try {
    const stats = await fetchJson(`${ME_BASE}/collections/${col.slug}/stats`);
    if (stats) {
      out.listedCount = stats.listedCount ?? null;
      out.floorPrice = stats.floorPrice ?? null;
      const fp = out.floorPrice;
      const floorSol = fp != null ? (fp >= 1000 ? fp / LAMPORTS_PER_SOL : Number(fp)) : null;
      out.floorPriceSol = floorSol != null && !isNaN(floorSol) ? floorSol.toFixed(4) : null;
      out.volumeAll = stats.volumeAll ?? null;
      out.volumeAllSol = out.volumeAll != null ? (out.volumeAll / LAMPORTS_PER_SOL).toFixed(2) : null;
      out.avgPrice24hr = stats.avgPrice24hr ?? null;
      out.avgPrice24hrSol = out.avgPrice24hr != null ? (out.avgPrice24hr / LAMPORTS_PER_SOL).toFixed(4) : null;
    }
  } catch (e) {
    console.warn("ME stats failed for", col.slug, e.message);
  }

  try {
    const meta = await fetchJson(`${ME_BASE}/collections/${col.slug}`);
    if (meta) {
      if (meta.name) out.name = meta.name;
      if (meta.description) out.description = meta.description;
      if (meta.image || meta.imageURI) out.image = meta.image || meta.imageURI;
      if (meta.animation_url || meta.animationUrl) out.animationUrl = meta.animation_url || meta.animationUrl;
      if (meta.totalSupply != null) out.supply = meta.totalSupply;
    }
  } catch (e) {}

  return out;
}

const { readBody } = require("./api/readBody.cjs");

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || "/", "http://localhost");
  const path = (u.pathname || "").replace(/\/$/, "") || "/";
  req.query = Object.fromEntries(u.searchParams);

  // Slots API (Supabase) — POST routes need body
  const slotsPost = [
    "/api/save-game",
    "/api/collect",
    "/api/confirm-collect",
  ];
  if (slotsPost.includes(path) && req.method === "POST") {
    try {
      req.body = await readBody(req);
      const mod = require("./api/" + path.replace("/api/", "") + ".cjs");
      await mod.handler(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }

  const slotsGet = ["/api/load-player", "/api/game-stats", "/api/leaderboard"];
  if (slotsGet.includes(path) && req.method === "GET") {
    try {
      const mod = require("./api/" + path.replace("/api/", "") + ".cjs");
      await mod.handler(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }

  if (path === "/api/airdrop/allocation" && req.method === "GET") {
    try {
      const mod = require("./api/airdrop/allocation.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/airdrop/claim" && req.method === "POST") {
    try {
      req.body = await readBody(req);
      const mod = require("./api/airdrop/claim.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/airdrop/x-auth" && req.method === "GET") {
    try {
      const mod = require("./api/airdrop/x-auth.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/airdrop/x-callback" && req.method === "GET") {
    try {
      const mod = require("./api/airdrop/x-callback.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/airdrop/x-unlink" && req.method === "POST") {
    try {
      const mod = require("./api/airdrop/x-unlink.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/airdrop/x-status" && req.method === "GET") {
    try {
      const mod = require("./api/airdrop/x-status.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/discord/auth" && req.method === "GET") {
    try {
      const mod = require("./api/discord/_auth.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/discord/callback" && req.method === "GET") {
    try {
      const mod = require("./api/discord/_callback.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/user/me" && req.method === "GET") {
    try {
      const mod = require("./api/user/me.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }
  if (path === "/api/user/link-wallet" && req.method === "POST") {
    try {
      req.body = await readBody(req);
      const mod = require("./api/user/link-wallet.cjs");
      const fn = typeof mod === "function" ? mod : mod.handler;
      await fn(req, res);
    } catch (e) {
      console.error(path, e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Server error", message: e.message }));
    }
    return;
  }

  if (path === "/api/collections" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      const results = await Promise.all(COLLECTIONS.map(getCollectionData));
      res.end(JSON.stringify({ collections: results }));
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Failed to fetch collections" }));
    }
    return;
  }

  if (path === "/api/prices" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    const now = Date.now();
    if (pricesCache.data && now - pricesCache.ts < PRICES_CACHE_MS) {
      res.end(JSON.stringify(pricesCache.data));
      return;
    }
    const out = { solUsd: null, buxUsd: null, knuklUsd: null };

    const tokenIds = [BUX_TOKEN_MINT, KNUKL_TOKEN_MINT].filter(Boolean);
    const ids = [SOL_MINT, ...tokenIds].join(",");
    try {
      const r = await fetch("https://api.jup.ag/price/v3?ids=" + encodeURIComponent(ids), {
        headers: { Accept: "application/json" },
      });
      const data = r.ok ? await r.json() : null;
      const d = data?.data || data || {};
      const sol = d[SOL_MINT];
      if (sol?.price != null) out.solUsd = Number(sol.price);
      if (sol?.usdPrice != null) out.solUsd = Number(sol.usdPrice);
      if (BUX_TOKEN_MINT && d[BUX_TOKEN_MINT]) {
        const p = d[BUX_TOKEN_MINT].price ?? d[BUX_TOKEN_MINT].usdPrice;
        if (p != null) out.buxUsd = Number(p);
      }
      if (KNUKL_TOKEN_MINT && d[KNUKL_TOKEN_MINT]) {
        const p = d[KNUKL_TOKEN_MINT].price ?? d[KNUKL_TOKEN_MINT].usdPrice;
        if (p != null) out.knuklUsd = Number(p);
      }
    } catch (e) {
      console.warn("Jupiter prices fetch failed", e.message);
    }

    if (out.solUsd == null || Number.isNaN(out.solUsd)) {
      try {
        const cg = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
          { headers: { Accept: "application/json" } }
        );
        const cgData = cg.ok ? await cg.json() : null;
        const usd = cgData?.solana?.usd;
        if (usd != null && !Number.isNaN(Number(usd))) out.solUsd = Number(usd);
      } catch (e) {
        console.warn("CoinGecko SOL fallback failed", e.message);
      }
    }

    pricesCache = { data: out, ts: now };
    res.end(JSON.stringify(out));
    return;
  }

  if (path === "/api/holders" && req.method === "GET") {
    const query = parsed.query;
    const group = (query.group || "KBDS").toUpperCase();
    const byGroup = COLLECTIONS.filter((c) => (c.group || "").toUpperCase() === group);
    const groupSlugs = byGroup.map((c) => c.slug);
    const HOLDER_EXCLUDED_SLUGS = ["kbds_rmx", "grim_sweepers"];
    const collectionsWithMint = byGroup.filter(
      (c) => c.collectionMint && !HOLDER_EXCLUDED_SLUGS.includes(c.slug)
    );
    const tokenMint = group === "BUXDAO" ? BUX_TOKEN_MINT : KNUKL_TOKEN_MINT;
    const tokenDecimals = group === "BUXDAO" ? BUX_TOKEN_DECIMALS : KNUKL_TOKEN_DECIMALS;
    const hasToken = tokenMint && HELIUS_API_KEY;
    const hasNfts = HELIUS_API_KEY && collectionsWithMint.length > 0;

    if (!hasToken && !hasNfts) {
      if (!HELIUS_API_KEY) {
        console.warn("Holders: set HELIUS_API_KEY in .env to fetch data.");
      } else {
        console.warn(
          "Holders: add BUX_TOKEN_MINT / KNUKL_TOKEN_MINT and COLLECTION_* in .env for token and NFT counts."
        );
      }
    }

    let walletToUser = null;
    if (process.env.DATABASE_URL) {
      try {
        const { sql } = require("./api/slots-helpers.cjs");
        if (sql) {
          const rows = await sql`SELECT uw.wallet_address, u.id AS user_id, u.discord_username FROM user_wallets uw JOIN users u ON u.id = uw.user_id`;
          walletToUser = new Map(rows.map((r) => [r.wallet_address, { user_id: r.user_id, discord_username: r.discord_username || null }]));
        }
      } catch (e) {
        console.warn("Holders: could not load user_wallets for aggregation", e.message);
      }
    }

    const holderMap = new Map();

    function getOrCreate(wallet) {
      if (!holderMap.has(wallet)) {
        holderMap.set(wallet, {
          wallet,
          tokenBalance: 0,
          tokenBalanceFormatted: "0",
          totalNfts: 0,
          collectionCounts: {},
        });
      }
      return holderMap.get(wallet);
    }

    if (hasToken) {
      const tokenProgramIds = [
        [TOKEN_PROGRAM_ID, "Token"],
        [TOKEN_2022_PROGRAM_ID, "Token-2022"],
      ];
      for (const [programId, label] of tokenProgramIds) {
        try {
          const gpaRes = await fetch(HELIUS_RPC + "/?api-key=" + encodeURIComponent(HELIUS_API_KEY), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "1",
              method: "getProgramAccounts",
              params: [
                programId,
                {
                  encoding: "base64",
                  commitment: "confirmed",
                  filters: [
                    { dataSize: 165 },
                    { memcmp: { offset: 0, bytes: tokenMint } },
                  ],
                },
              ],
            }),
          });
          const gpa = await gpaRes.json();
          if (gpa?.error) {
            console.warn("Holders token RPC error", label, gpa.error.message || gpa.error);
            continue;
          }
          const rawResult = gpa?.result;
          const accounts = Array.isArray(rawResult) ? rawResult : rawResult?.value ?? [];
          let added = 0;
          for (const item of accounts) {
            const data = item.account?.data;
            if (data == null) continue;
            const raw = typeof data === "string" ? data : Array.isArray(data) ? data[0] : data;
            const decoded = decodeTokenAccountFull(raw);
            if (!decoded || decoded.amount === 0) continue;
            const balance = decoded.amount / Math.pow(10, tokenDecimals);
            if (!Number.isFinite(balance)) continue;
            const h = getOrCreate(decoded.owner);
            h.tokenBalance += balance;
            h.tokenBalanceFormatted = formatTokenAmount(h.tokenBalance);
            added++;
          }
          if (accounts.length > 0 || added > 0) {
            console.log("Holders token", label, "accounts:", accounts.length, "decoded:", added);
          }
        } catch (e) {
          console.warn("Holders token fetch failed", label, e.message);
        }
      }
    }

    if (hasNfts) {
      for (const col of collectionsWithMint) {
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          try {
            const dasRes = await fetch(HELIUS_RPC + "/?api-key=" + encodeURIComponent(HELIUS_API_KEY), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: "1",
                method: "getAssetsByGroup",
                params: {
                  groupKey: "collection",
                  groupValue: col.collectionMint,
                  page,
                  limit: 1000,
                },
              }),
            });
            const das = await dasRes.json();
            const items = das?.result?.items || [];
            for (const item of items) {
              const owner = item.ownership?.owner;
              if (owner) {
                const h = getOrCreate(owner);
                const count = (h.collectionCounts[col.slug] || 0) + 1;
                h.collectionCounts[col.slug] = count;
                h.totalNfts = (h.totalNfts || 0) + 1;
              }
            }
            hasMore = items.length === 1000;
            page++;
            if (page > 50) break;
          } catch (e) {
            console.warn("Holders NFT fetch failed for", col.slug, e.message);
            hasMore = false;
          }
        }
      }
    }

    let list = Array.from(holderMap.values()).map((h) => ({
      wallet: h.wallet,
      tokenBalance: h.tokenBalance,
      tokenBalanceFormatted: h.tokenBalanceFormatted,
      totalNfts: h.totalNfts || 0,
      collectionCounts: h.collectionCounts || {},
    }));

    if (walletToUser && walletToUser.size > 0) {
      const byUserId = new Map();
      const unlinked = [];
      for (const h of list) {
        const u = walletToUser.get(h.wallet);
        if (u) {
          const key = u.user_id;
          if (!byUserId.has(key)) {
            byUserId.set(key, {
              displayName: u.discord_username || (h.wallet.slice(0, 4) + "…" + h.wallet.slice(-4)),
              wallets: [h.wallet],
              tokenBalance: 0,
              totalNfts: 0,
              collectionCounts: {},
            });
          }
          const agg = byUserId.get(key);
          agg.tokenBalance += h.tokenBalance || 0;
          agg.totalNfts += h.totalNfts || 0;
          Object.keys(h.collectionCounts || {}).forEach((slug) => {
            agg.collectionCounts[slug] = (agg.collectionCounts[slug] || 0) + (h.collectionCounts[slug] || 0);
          });
          if (!agg.wallets.includes(h.wallet)) agg.wallets.push(h.wallet);
        } else {
          unlinked.push({
            displayName: h.wallet.slice(0, 4) + "…" + h.wallet.slice(-4),
            wallet: h.wallet,
            tokenBalance: h.tokenBalance,
            tokenBalanceFormatted: h.tokenBalanceFormatted,
            totalNfts: h.totalNfts || 0,
            collectionCounts: h.collectionCounts || {},
          });
        }
      }
      list = [
        ...Array.from(byUserId.values()).map((agg) => ({
          displayName: agg.displayName,
          wallets: agg.wallets,
          tokenBalance: agg.tokenBalance,
          tokenBalanceFormatted: formatTokenAmount(agg.tokenBalance),
          totalNfts: agg.totalNfts,
          collectionCounts: agg.collectionCounts,
        })),
        ...unlinked,
      ];
    } else {
      list = list.map((h) => ({
        displayName: h.wallet.slice(0, 4) + "…" + h.wallet.slice(-4),
        wallet: h.wallet,
        tokenBalance: h.tokenBalance,
        tokenBalanceFormatted: h.tokenBalanceFormatted,
        totalNfts: h.totalNfts || 0,
        collectionCounts: h.collectionCounts || {},
      }));
    }

    const totalScore = (h) => (h.tokenBalance || 0) / 1e6 + (h.totalNfts || 0) * 10;
    list.sort((a, b) => totalScore(b) - totalScore(a));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({ holders: list, sort: "total" }));
    return;
  }

  if (path === "/api/health" && req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify({
      ok: true,
      routes: ["collections", "prices", "holders", "airdrop/allocation", "airdrop/claim", "airdrop/x-auth", "airdrop/x-callback", "airdrop/x-status", "airdrop/x-unlink", "save-game", "load-player", "game-stats", "leaderboard", "collect", "confirm-collect"],
    }));
    return;
  }

  res.statusCode = 404;
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Collections API listening on http://localhost:${PORT}`);
});
