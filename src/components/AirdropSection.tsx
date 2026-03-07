import { useState, useEffect } from "react";
import { Wallet, Package, Dices, MessageCircle } from "lucide-react";
import { useWallet } from "../context/WalletContext";

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
  value: number; // placeholder; backend will supply
};

export function AirdropSection() {
  const { walletConnected } = useWallet();
  const countdown = useCountdownToNextMidnightET();

  const allocationRows: AllocationRow[] = [
    {
      id: "archive",
      label: "Archive collection holdings",
      description: "Based on your archive NFT holdings",
      icon: <Package className="size-5 text-[var(--dashboard-accent)]" aria-hidden />,
      value: walletConnected ? 0 : 0, // TODO: from API when connected
    },
    {
      id: "casino",
      label: "Casino play (previous day)",
      description: "Activity from yesterday on Slotto.gg",
      icon: <Dices className="size-5 text-[var(--dashboard-accent)]" aria-hidden />,
      value: walletConnected ? 0 : 0,
    },
    {
      id: "x",
      label: "X (Twitter) engagement",
      description: "Engagement on project posts",
      icon: <MessageCircle className="size-5 text-[var(--dashboard-accent)]" aria-hidden />,
      value: walletConnected ? 0 : 0,
    },
  ];

  const totalAllocation = allocationRows.reduce((sum, r) => sum + r.value, 0);
  const canClaim = walletConnected; // and not yet claimed today, etc.

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
          Your share is based on archive holdings, yesterday’s casino play, and X engagement. Claim once per day after midnight ET.
        </p>
        <ul className="space-y-3">
          {allocationRows.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"
            >
              <div className="flex-shrink-0">{row.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{row.label}</p>
                <p className="text-xs text-[var(--dashboard-muted)] mt-0.5">{row.description}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-lg font-semibold tabular-nums text-white">
                  {walletConnected ? row.value : 0}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between p-4 rounded-xl border-2 border-[var(--dashboard-border-light)] bg-[var(--dashboard-surface)]">
          <span className="font-semibold text-white">Total allocation</span>
          <span className="text-xl font-bold tabular-nums text-[var(--dashboard-accent)]">
            {walletConnected ? totalAllocation : 0}
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
          <button
            type="button"
            disabled={!canClaim}
            className={`
              px-6 py-4 rounded-xl font-semibold text-lg transition-all border-2
              ${canClaim
                ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/20 text-white hover:bg-[var(--dashboard-accent)]/30 hover:shadow-[0_0_20px_var(--dashboard-glow)]"
                : "border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] cursor-not-allowed"}
            `}
          >
            {walletConnected ? "Claim" : "Connect wallet to claim"}
          </button>
        </div>
      </section>
    </div>
  );
}
