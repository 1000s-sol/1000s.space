import { useState, useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type GameId = "slots" | "roulette" | "blackjack";
type SlotsToken = "knukl" | "bux";

const GAME_CONFIG: Record<GameId, { title: string; built: boolean; iframeSrc?: string }> = {
  slots: { title: "Slots", built: true, iframeSrc: "/casino/slots.html" },
  roulette: { title: "Roulette", built: true, iframeSrc: "/casino/roulette.html" },
  blackjack: { title: "Black Jack", built: false },
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tokenParam = searchParams.get("token") as SlotsToken | null;
  const [slotsToken, setSlotsToken] = useState<SlotsToken>(
    tokenParam === "bux" || tokenParam === "knukl" ? tokenParam : "knukl"
  );
  const config = gameId && gameId in GAME_CONFIG ? GAME_CONFIG[gameId as GameId] : null;
  const isSlots = config && gameId === "slots";
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleConnectWallet = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "CONNECT_WALLET" }, "*");
    } catch {
      // cross-origin or not loaded
    }
  };

  useEffect(() => {
    const t = searchParams.get("token");
    if (t === "knukl" || t === "bux") setSlotsToken(t);
  }, [searchParams]);

  const handleSlotsTokenChange = (t: SlotsToken) => {
    setSlotsToken(t);
    setSearchParams({ token: t }, { replace: true });
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--dashboard-bg)] flex items-center justify-center">
        <p className="text-[var(--dashboard-muted)]">Game not found.</p>
        <Link to="/" state={{ returnTo: "casino" }} className="ml-4 text-[var(--dashboard-accent)]">Back to 1000s</Link>
      </div>
    );
  }

  const iframeSrc =
    config.built && config.iframeSrc
      ? isSlots
        ? `${config.iframeSrc}?token=${slotsToken}`
        : config.iframeSrc
      : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dashboard-bg)]">
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
        <Link
          to="/"
          state={{ returnTo: "casino" }}
          className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-muted)] hover:text-white transition-colors flex-shrink-0"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to 1000s
        </Link>
        <div className="flex-1 flex justify-center min-w-0">
          {isSlots ? (
            <div className="flex items-center gap-1 rounded-xl border-2 border-[var(--dashboard-border)] p-1 bg-[var(--dashboard-bg)]" role="tablist" aria-label="Play with token">
              <button
                type="button"
                role="tab"
                aria-selected={slotsToken === "knukl"}
                onClick={() => handleSlotsTokenChange("knukl")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  slotsToken === "knukl"
                    ? "bg-[var(--dashboard-accent)] text-white shadow-[0_0_12px_var(--dashboard-glow)]"
                    : "text-[var(--dashboard-muted)] hover:text-white"
                }`}
              >
                $KNUKL
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={slotsToken === "bux"}
                onClick={() => handleSlotsTokenChange("bux")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  slotsToken === "bux"
                    ? "bg-[var(--dashboard-accent)] text-white shadow-[0_0_12px_var(--dashboard-glow)]"
                    : "text-[var(--dashboard-muted)] hover:text-white"
                }`}
              >
                $BUX
              </button>
            </div>
          ) : (
            <span className="text-base font-semibold text-white">{config.title}</span>
          )}
        </div>
        {isSlots ? (
            <button
              type="button"
              onClick={handleConnectWallet}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]/20 text-white hover:bg-[var(--dashboard-accent)]/30 transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="w-[5.5rem] flex-shrink-0" aria-hidden />
          )}
      </header>

      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          title={config.title}
          src={iframeSrc}
          className="flex-1 w-full min-h-0 border-0"
          allow="fullscreen"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="rounded-2xl border-2 border-[var(--dashboard-border)] p-8 text-center max-w-md" style={{ background: 'var(--dashboard-card)' }}>
            <h2 className="text-2xl font-semibold text-white mb-2">{config.title}</h2>
            <p className="text-[var(--dashboard-muted)]">Coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
}
