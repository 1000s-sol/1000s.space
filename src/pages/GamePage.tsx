import { useState, useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Wallet } from "lucide-react";

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

  const handleToggleMusic = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: "TOGGLE_MUSIC" }, "*");
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleToggleMusic}
                className="p-2 rounded-lg text-[var(--dashboard-muted)] hover:text-white hover:bg-white/10 transition-colors"
                title="Toggle music"
                aria-label="Toggle music on or off"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-5" aria-hidden>
                  <path fillRule="evenodd" clipRule="evenodd" d="M21.6464 2.23699C21.8707 2.42699 22 2.70606 22 3.00001V16C22 18.2091 20.2091 20 18 20C15.7909 20 14 18.2091 14 16C14 13.7909 15.7909 12 18 12C18.7286 12 19.4117 12.1948 20 12.5351V4.18047L10 5.84713V18L9.99999 18.0032C9.99824 20.2109 8.20806 22 6 22C3.79086 22 2 20.2091 2 18C2 15.7909 3.79086 14 6 14C6.72857 14 7.41165 14.1948 8 14.5351V5.00001C8 4.51117 8.35341 4.09398 8.8356 4.01361L20.8356 2.01361C21.1256 1.96529 21.4221 2.04698 21.6464 2.23699ZM20 16C20 14.8954 19.1046 14 18 14C16.8954 14 16 14.8954 16 16C16 17.1046 16.8954 18 18 18C19.1046 18 20 17.1046 20 16ZM6 16C7.10457 16 8 16.8954 8 18C8 19.1046 7.10457 20 6 20C4.89543 20 4 19.1046 4 18C4 16.8954 4.89543 16 6 16Z" fill="currentColor"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={handleConnectWallet}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 hover:shadow-[0_0_16px_var(--dashboard-glow)] transition-colors"
              >
                <Wallet className="size-5 flex-shrink-0" aria-hidden />
                Connect
              </button>
            </div>
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
