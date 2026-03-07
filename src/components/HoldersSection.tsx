import { useState, useEffect, useMemo } from "react";
import type { HolderRow, HoldersResponse, PricesResponse } from "../types/holders";
import type { CollectionItem, CollectionsResponse } from "../types/collections";

const GROUP_ORDER = ["KBDS", "BUXDAO"] as const;
type GroupId = (typeof GROUP_ORDER)[number];

const ME_ESCROW_WALLET = "1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix";

/** Wallet → display label (green text). */
const WALLET_LABELS: Record<string, string> = {
  "8aUvUpPpnqHCrzdfPcUG643z2mKtWNfPveScYH8t3uN5": "Treasury",
  "FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75": "Treasury",
  "3E7B1zi8KH71aKWJiA5kCaJ9NYDKAvJLkeZi4WXS8SXp": "Slotto.gg",
};

type ViewMode = "all" | "nfts" | "token" | "collection";

/** Column header / display abbrevs: KBDS, YOTR, etc. */
const COLLECTION_ABBREV: Record<string, string> = {
  kbds_og: "KBDS",
  kbds_art: "KBDS Art",
  kbds_rmx: "RMX",
  kbds_yotr: "YOTR",
  kbds_pinups: "Pinups",
  grim_sweepers: "Grim Sweepers",
  fcked_catz: "Fcked Catz",
  celebcatz: "Celeb Catz",
  money_monsters: "Money Monsters",
  moneymonsters3d: "MM 3D",
  ai_bitbots: "AI BitBots",
};

function collectionDisplayName(symbol: string): string {
  return COLLECTION_ABBREV[symbol] ?? symbol;
}

function formatUsd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(2) + "K";
  if (n >= 1) return "$" + n.toFixed(2);
  if (n >= 0.01) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
}

function getTotalNfts(h: HolderRow): number {
  if (h.totalNfts != null && !Number.isNaN(h.totalNfts)) return h.totalNfts;
  const c = h.collectionCounts;
  if (c && typeof c === "object") return Object.values(c).reduce((s, n) => s + Number(n) || 0, 0);
  return (h.mnk3ysCount ?? 0) + (h.zmb3ysCount ?? 0);
}

function getCollectionCount(h: HolderRow, symbol: string): number {
  if (h.collectionCounts && h.collectionCounts[symbol] != null) return Number(h.collectionCounts[symbol]);
  return 0;
}

export function HoldersSection() {
  const [group, setGroup] = useState<GroupId>("KBDS");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [collectionSymbol, setCollectionSymbol] = useState<string>("");

  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [holders, setHolders] = useState<HolderRow[]>([]);
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const groupCollections = useMemo(() => {
    return collections.filter((c) => (c.group || "Other") === group);
  }, [collections, group]);

  useEffect(() => {
    if (viewMode === "collection" && groupCollections.length && !collectionSymbol) {
      setCollectionSymbol(groupCollections[0].symbol);
    }
  }, [viewMode, groupCollections, collectionSymbol]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ group });
    Promise.all([
      fetch("/api/collections", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/holders?" + params.toString(), { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/prices", { credentials: "include" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([colData, holdersData, pricesData]: [CollectionsResponse | null, HoldersResponse | null, PricesResponse | null]) => {
        if (colData?.collections?.length) setCollections(colData.collections);
        if (holdersData?.holders) setHolders(holdersData.holders);
        setPrices(pricesData || null);
      })
      .catch(() => setError("Could not load holders."))
      .finally(() => setLoading(false));
  }, [group]);

  const solUsd = prices?.solUsd != null ? Number(prices.solUsd) : null;
  const tokenPrice = group === "BUXDAO" ? prices?.buxUsd : prices?.knuklUsd;
  const tokenUsdNum = tokenPrice != null && !Number.isNaN(tokenPrice) ? tokenPrice : null;
  const floorsBySymbol: Record<string, number> = useMemo(() => {
    const out: Record<string, number> = {};
    groupCollections.forEach((c) => {
      const floor = c.floorPriceSol != null ? parseFloat(String(c.floorPriceSol)) : null;
      if (floor != null) out[c.symbol] = floor;
    });
    return out;
  }, [groupCollections]);

  function nftValueUsd(h: HolderRow): number | null {
    if (solUsd == null || Number.isNaN(solUsd) || solUsd <= 0) return null;
    const nftSol = groupCollections.reduce(
      (sum, c) => sum + getCollectionCount(h, c.symbol) * (floorsBySymbol[c.symbol] ?? 0),
      0
    );
    return nftSol * solUsd;
  }

  function tokenValueUsd(h: HolderRow): number | null {
    if (tokenUsdNum == null || h.tokenBalance == null) return null;
    return h.tokenBalance * tokenUsdNum;
  }

  function totalValueUsd(h: HolderRow): number | null {
    const tv = tokenValueUsd(h);
    const nv = nftValueUsd(h);
    if (tv != null || nv != null) return (tv ?? 0) + (nv ?? 0);
    return null;
  }

  function valueForView(h: HolderRow): number | null {
    if (viewMode === "all") return totalValueUsd(h);
    if (viewMode === "nfts") return nftValueUsd(h);
    if (viewMode === "token") return tokenValueUsd(h);
    if (viewMode === "collection" && collectionSymbol) {
      const n = getCollectionCount(h, collectionSymbol);
      const floor = floorsBySymbol[collectionSymbol] ?? 0;
      if (solUsd != null) return n * floor * solUsd;
    }
    return null;
  }

  const sortedHolders = useMemo(() => {
    const list = [...holders];
    list.sort((a, b) => {
      const va = valueForView(a);
      const vb = valueForView(b);
      if (va != null || vb != null) return (vb ?? -1) - (va ?? -1);
      return (b.tokenBalance ?? 0) - (a.tokenBalance ?? 0);
    });
    return list;
  }, [holders, viewMode, collectionSymbol, groupCollections, floorsBySymbol, solUsd, tokenUsdNum]);

  const walletLink = (w: string) => "https://solscan.io/account/" + encodeURIComponent(w);
  const walletShort = (w: string) => (w.length > 12 ? w.slice(0, 4) + "…" + w.slice(-4) : w);
  const isMeEscrow = (w: string) => w === ME_ESCROW_WALLET;
  const walletLabel = (w: string) => WALLET_LABELS[w];
  const tokenLabel = group === "BUXDAO" ? "BUX" : "KNUKL";

  return (
    <section className="w-full">
      <p className="text-sm text-[var(--dashboard-muted)] mb-4">
        Top holders by token and NFT collections for the selected group. Sorted by total value ($).
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-full border-2 border-[var(--dashboard-border)] p-0.5 bg-[var(--dashboard-surface)]">
          {GROUP_ORDER.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                group === g
                  ? "bg-[var(--dashboard-accent)] text-white"
                  : "text-[var(--dashboard-muted)] hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--dashboard-muted)]">
          <span>View:</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="rounded-lg border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--dashboard-accent)]"
            aria-label="View mode"
          >
            <option value="all">All</option>
            <option value="nfts">NFTs only</option>
            <option value="token">{tokenLabel}</option>
            <option value="collection">Collections</option>
          </select>
        </label>

        {viewMode === "collection" && groupCollections.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-[var(--dashboard-muted)]">
            <span>Collection:</span>
            <select
              value={collectionSymbol}
              onChange={(e) => setCollectionSymbol(e.target.value)}
              className="rounded-lg border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--dashboard-accent)]"
              aria-label="Collection"
            >
              {groupCollections.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {collectionDisplayName(c.symbol)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="rounded-xl border-2 border-[var(--dashboard-border)] overflow-hidden bg-[var(--dashboard-surface)]">
        {loading ? (
          <div className="py-12 text-center text-[var(--dashboard-muted)]">Loading…</div>
        ) : error ? (
          <div className="py-12 text-center text-[var(--dashboard-muted)]">{error}</div>
        ) : !sortedHolders.length ? (
          <div className="py-12 px-4 text-center text-[var(--dashboard-muted)]">
            <p className="font-medium mb-2">No holder data</p>
            <p className="text-sm max-w-md mx-auto">
              In .env set <strong>BUX_TOKEN_MINT</strong> and <strong>KNUKL_TOKEN_MINT</strong> for token balances, and
              the 11 <strong>COLLECTION_*</strong> addresses for NFT counts. Restart the API (
              <code className="text-xs bg-black/30 px-1 rounded">npm run api</code>) after changing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--dashboard-border)]">
                  <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                    #
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                    Wallet
                  </th>
                  {(viewMode === "all" || viewMode === "token") && (
                    <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                      {tokenLabel}
                    </th>
                  )}
                  {(viewMode === "all" || viewMode === "nfts") && (
                    <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                      NFTs
                    </th>
                  )}
                  {viewMode === "collection" && (
                    <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                      {collectionSymbol ? collectionDisplayName(collectionSymbol) : "—"}
                    </th>
                  )}
                  <th scope="col" className="py-3 px-4 text-xs uppercase tracking-wide text-[var(--dashboard-muted)]">
                    Value ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedHolders.map((h, i) => {
                  const totalNfts = getTotalNfts(h);
                  const displayVal = valueForView(h);
                  return (
                    <tr
                      key={h.wallet}
                      className="border-b border-[var(--dashboard-border)]/50 hover:bg-[var(--dashboard-border)]/20"
                    >
                      <td className="py-2.5 px-4 text-sm text-[var(--dashboard-muted)]">{i + 1}</td>
                      <td className="py-2.5 px-4">
                        {walletLabel(h.wallet) ? (
                          <span className="text-sm font-medium text-emerald-400">{walletLabel(h.wallet)}</span>
                        ) : isMeEscrow(h.wallet) ? (
                          <span className="text-sm font-medium text-orange-500">ME listings</span>
                        ) : (
                          <a
                            href={walletLink(h.wallet)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--dashboard-accent)] hover:underline"
                          >
                            {walletShort(h.wallet)}
                          </a>
                        )}
                      </td>
                      {(viewMode === "all" || viewMode === "token") && (
                        <td className="py-2.5 px-4 text-sm text-white">
                          {h.tokenBalanceFormatted ?? String(h.tokenBalance ?? 0)}
                        </td>
                      )}
                      {(viewMode === "all" || viewMode === "nfts") && (
                        <td className="py-2.5 px-4 text-sm text-white">{totalNfts}</td>
                      )}
                      {viewMode === "collection" && (
                        <td className="py-2.5 px-4 text-sm text-white">
                          {getCollectionCount(h, collectionSymbol)}
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-sm text-white">{formatUsd(displayVal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
