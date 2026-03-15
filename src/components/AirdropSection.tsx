import { useState, useEffect } from "react";
import { Wallet, Package, Dices, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { DiscordIcon } from "./icons/DiscordIcon";
import { XIcon } from "./icons/XIcon";

/** Returns the next midnight in America/New_York (EST/EDT). */
function getNextMidnightET(): Date {
  const now = new Date();
  const parts = now
    .toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(", ", " ")
    .split(/[\s/,:]+/);
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  const next = new Date(year, month, day + 1);
  // Midnight ET: 05:00 UTC (EST) or 04:00 UTC (EDT). Use EST per copy.
  const utcHour = 5;
  return new Date(
    Date.UTC(next.getFullYear(), next.getMonth(), next.getDate(), utcHour, 0, 0, 0)
  );
}

function useCountdownToNextMidnightET() {
  const [next, setNext] = useState<Date>(() => getNextMidnightET());
  const [diff, setDiff] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      let target = next;
      if (now >= target) {
        target = getNextMidnightET();
        setNext(target);
      }
      const ms = Math.max(0, target.getTime() - now.getTime());
      const s = Math.floor((ms / 1000) % 60);
      const m = Math.floor((ms / 60000) % 60);
      const h = Math.floor(ms / 3600000);
      setDiff({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [next]);

  return diff;
}

type AllocationRow = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
};

type ArchiveBreakdownItem = {
  slug: string;
  name: string;
  count: number;
  multiplier: number;
  allocation: number;
};

type XFollowedAccount = { username: string; followed: boolean };

type AllocationData = {
  allocations: { archive: number; casino: number; x: number; discord: number };
  archiveBreakdown?: ArchiveBreakdownItem[];
  xFollowedAccounts?: XFollowedAccount[];
  xEngagement?: { likedCount: number; repostedCount: number; mentionedCount: number; allocation: number; repostUnavailable?: boolean };
  xCreditsDepleted?: boolean;
  totalAllocation: number;
  claimed: boolean;
};

export function AirdropSection() {
  const { walletConnected, walletAddress, discordId, xLinked, xUsername } = useWallet();
  const countdown = useCountdownToNextMidnightET();
  const [allocation, setAllocation] = useState<AllocationData | null>(null);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [archiveExpanded, setArchiveExpanded] = useState(false);
  const [xExpanded, setXExpanded] = useState(false);
  useEffect(() => {
    if (!walletAddress) {
      setAllocation(null);
      return;
    }
    let cancelled = false;
    setAllocationLoading(true);
    const ensureLinkThenFetch = async () => {
      if (discordId) {
        try {
          await fetch("/api/user/link-wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ discordId, walletAddress }),
          });
        } catch (_) {}
      }
      const r = await fetch(`/api/airdrop/allocation?walletAddress=${encodeURIComponent(walletAddress)}`);
      if (cancelled) return;
      let data: Record<string, unknown> = {};
      try {
        data = await r.json();
      } catch {
        setAllocation({
          allocations: { archive: 0, casino: 0, x: 0, discord: 0 },
          archiveBreakdown: [],
          xFollowedAccounts: [],
          totalAllocation: 0,
          claimed: false,
        });
        return;
      }
      if (!r.ok) {
        setAllocation({
          allocations: { archive: 0, casino: 0, x: 0, discord: 0 },
          archiveBreakdown: [],
          xFollowedAccounts: [],
          totalAllocation: 0,
          claimed: false,
        });
        return;
      }
      setAllocation({
        allocations: (data.allocations as AllocationData["allocations"]) ?? { archive: 0, casino: 0, x: 0, discord: 0 },
        archiveBreakdown: (data.archiveBreakdown as AllocationData["archiveBreakdown"]) ?? [],
        xFollowedAccounts: (data.xFollowedAccounts as AllocationData["xFollowedAccounts"]) ?? [],
        xEngagement: data.xEngagement as AllocationData["xEngagement"] | undefined,
        xCreditsDepleted: data.xCreditsDepleted as boolean | undefined,
        totalAllocation: Number(data.totalAllocation) ?? 0,
        claimed: Boolean(data.claimed),
      });
    };
    ensureLinkThenFetch()
      .catch(() => {
        if (!cancelled) setAllocation(null);
      })
      .finally(() => setAllocationLoading(false));
    return () => {
      cancelled = true;
    };
  }, [walletAddress, discordId]);

  const allocationRows: AllocationRow[] = [
    {
      id: "archive",
      label: "Archive collection holdings",
      description: "Based on your archive NFT holdings",
      icon: <Package className="size-5 text-[var(--dashboard-accent)]" aria-hidden />,
      value: allocation?.allocations.archive ?? 0,
    },
    {
      id: "casino",
      label: "Casino play (previous day)",
      description: "Activity from yesterday on Slotto.gg",
      icon: <Dices className="size-5 text-[var(--dashboard-accent)]" aria-hidden />,
      value: allocation?.allocations.casino ?? 0,
    },
    {
      id: "x",
      label: "X (Twitter) engagement",
      description: xLinked ? `Connected as ${xUsername ?? "X"}` : "Connect X in the sidebar to earn engagement rewards",
      icon: <XIcon className="size-5 text-[var(--dashboard-accent)]" />,
      value: allocation?.allocations.x ?? 0,
    },
    {
      id: "discord",
      label: "Discord engagement",
      description: "Daily activity in Discord",
      icon: <DiscordIcon className="size-5 text-[var(--dashboard-accent)]" />,
      value: allocation?.allocations.discord ?? 0,
    },
  ];

  const totalAllocation = allocation?.totalAllocation ?? allocationRows.reduce((sum, r) => sum + r.value, 0);
  const claimed = allocation?.claimed ?? false;
  const canClaim = walletConnected && !!walletAddress && totalAllocation > 0 && !claimed;

  const handleClaim = () => {
    if (!walletAddress || claimLoading || !canClaim) return;
    setClaimError(null);
    setClaimLoading(true);
    fetch("/api/airdrop/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error && !data.alreadyClaimed) {
          setClaimError(data.error);
        } else if (data.success && allocation) {
          setAllocation({ ...allocation, claimed: true });
        }
      })
      .catch(() => setClaimError("Claim failed"))
      .finally(() => setClaimLoading(false));
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      {!walletConnected && (
        <div
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 text-amber-200"
          role="alert"
        >
          <Wallet className="size-8 flex-shrink-0 text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold text-white">Connect wallet for claims</p>
            <p className="text-sm text-amber-200/90 mt-0.5">
              Connect your wallet to see your allocation and claim your daily airdrop.
            </p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Daily allocation</h2>
        <p className="text-sm text-[var(--dashboard-muted)] mb-4">
          Your share is based on archive holdings, yesterday’s casino play, X engagement, and Discord activity. Claim once per day after midnight ET.
        </p>
        <ul className="space-y-3">
          {allocationRows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] overflow-hidden"
            >
              {row.id === "archive" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setArchiveExpanded((e) => !e)}
                    className="flex items-center gap-4 p-4 w-full text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-shrink-0">{row.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{row.label}</p>
                      <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">{row.description}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-lg font-semibold tabular-nums text-white">
                        {allocationLoading ? "…" : (walletConnected ? row.value : 0)}
                      </span>
                      {archiveExpanded ? (
                        <ChevronDown className="size-5 text-[var(--dashboard-muted)]" aria-hidden />
                      ) : (
                        <ChevronRight className="size-5 text-[var(--dashboard-muted)]" aria-hidden />
                      )}
                    </div>
                  </button>
                  {archiveExpanded && (allocation?.archiveBreakdown?.length ?? 0) > 0 && (
                    <div className="border-t border-[var(--dashboard-border)] bg-black/20 px-4 py-3">
                      <p className="text-xs font-medium text-[var(--dashboard-muted)] mb-2">Holdings × multiplier = allocation</p>
                      <ul className="space-y-2">
                        {(allocation?.archiveBreakdown ?? []).map((item) => (
                          <li
                            key={item.slug}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-[var(--dashboard-text)] truncate">
                              {item.name} (x{item.multiplier})
                            </span>
                            <span className="font-medium tabular-nums text-white shrink-0">
                              {item.allocation}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {archiveExpanded && (!allocation?.archiveBreakdown?.length) && !allocationLoading && (
                    <div className="border-t border-[var(--dashboard-border)] bg-black/20 px-4 py-3 text-sm text-[var(--dashboard-muted)]">
                      No archive NFTs in eligible collections.
                    </div>
                  )}
                </>
              ) : row.id === "x" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setXExpanded((e) => !e)}
                    className="flex items-center gap-4 p-4 w-full text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-shrink-0">{row.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{row.label}</p>
                      <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">{row.description}</p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-lg font-semibold tabular-nums text-white">
                        {allocationLoading ? "…" : (walletConnected ? row.value : 0)}
                      </span>
                      {xExpanded ? (
                        <ChevronDown className="size-5 text-[var(--dashboard-muted)]" aria-hidden />
                      ) : (
                        <ChevronRight className="size-5 text-[var(--dashboard-muted)]" aria-hidden />
                      )}
                    </div>
                  </button>
                  {xExpanded && (
                    <div className="border-t border-[var(--dashboard-border)] bg-black/20 px-4 py-3">
                      {allocation?.xCreditsDepleted && (
                        <p className="text-xs text-amber-400/90 mb-2">X check temporarily unavailable (API credits depleted). Follow counts will update when credits are restored.</p>
                      )}
                      {allocation?.xEngagement && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-[var(--dashboard-muted)] mb-1.5">Engagements (24h):</p>
                          <div className="grid grid-cols-1 gap-1 text-sm text-[var(--dashboard-text)]">
                            <div className="flex justify-between">
                              <span>Liked</span>
                              <span className="tabular-nums font-medium text-white">{allocation.xEngagement.likedCount ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Reposted</span>
                              <span className="tabular-nums font-medium text-white">
                                {allocation.xEngagement.repostUnavailable ? "N/A" : (allocation.xEngagement.repostedCount ?? 0)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Mentioned</span>
                              <span className="tabular-nums font-medium text-white">{allocation.xEngagement.mentionedCount ?? 0}</span>
                            </div>
                          </div>
                          <p className="text-xs text-emerald-400/90 mt-1">+{allocation.xEngagement.allocation ?? 0} allocation (10 per engagement)</p>
                        </div>
                      )}
                      <p className="text-xs font-medium text-[var(--dashboard-muted)] mb-2">Following:</p>
                      <ul className="space-y-1.5 text-sm text-[var(--dashboard-text)]">
                        {(allocation?.xFollowedAccounts ?? [
                          { username: "@1000s_sol", followed: false },
                          { username: "@BUXDAO", followed: false },
                          { username: "@knucklebunnyds", followed: false },
                          { username: "@slottogg_", followed: false },
                        ]).map((acc) => (
                          <li key={acc.username} className="flex items-center gap-2">
                            {acc.followed ? (
                              <Check className="size-4 text-emerald-400 shrink-0" aria-hidden />
                            ) : (
                              <X className="size-4 text-red-400/90 shrink-0" aria-hidden />
                            )}
                            <span>{acc.username}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0">{row.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{row.label}</p>
                    <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">{row.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className="text-lg font-semibold tabular-nums text-white">
                      {allocationLoading ? "…" : (walletConnected ? row.value : 0)}
                    </span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between p-4 rounded-xl border-2 border-[var(--dashboard-border-light)] bg-[var(--dashboard-surface)]">
          <span className="font-semibold text-white">Total allocation</span>
          <span className="text-xl font-bold tabular-nums text-[var(--dashboard-accent)]">
            {allocationLoading ? "…" : (walletConnected ? totalAllocation : 0)}
          </span>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Claim</h2>
        <p className="text-sm text-[var(--dashboard-muted)] mb-4">
          One claim per day. Next claim available at midnight ET.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center justify-center gap-2 sm:gap-4 px-5 py-4 rounded-xl border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
            <span className="text-sm text-[var(--dashboard-muted)]">Next claim in</span>
            <span className="font-mono text-xl font-bold tabular-nums text-white">
              {String(countdown.h).padStart(2, "0")}:{String(countdown.m).padStart(2, "0")}:
              {String(countdown.s).padStart(2, "0")}
            </span>
          </div>
          {claimError && (
            <p className="text-sm text-amber-400" role="alert">
              {claimError}
            </p>
          )}
          <button
            type="button"
            disabled={!canClaim || claimLoading}
            onClick={handleClaim}
            className={`
              px-6 py-4 rounded-xl font-semibold text-lg transition-all border-2
              ${canClaim && !claimLoading
                ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/20 text-white hover:bg-[var(--dashboard-accent)]/30 hover:shadow-[0_0_20px_var(--dashboard-glow)]"
                : "border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] cursor-not-allowed"}
            `}
          >
            {claimLoading
              ? "Claiming…"
              : claimed
                ? "Claimed today"
                : walletConnected
                  ? totalAllocation > 0
                    ? "Claim"
                    : "No allocation to claim"
                  : "Connect wallet to claim"}
          </button>
        </div>
      </section>
    </div>
  );
}
