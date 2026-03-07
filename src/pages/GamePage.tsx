import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type GameId = "slots" | "roulette" | "blackjack";

const GAME_CONFIG: Record<GameId, { title: string; built: boolean; iframeSrc?: string }> = {
  slots: { title: "Slots", built: true, iframeSrc: "/casino/slots.html" },
  roulette: { title: "Roulette", built: true, iframeSrc: "/casino/roulette.html" },
  blackjack: { title: "Black Jack", built: false },
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const config = gameId && gameId in GAME_CONFIG ? GAME_CONFIG[gameId as GameId] : null;

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--dashboard-bg)] flex items-center justify-center">
        <p className="text-[var(--dashboard-muted)]">Game not found.</p>
        <Link to="/" state={{ returnTo: "casino" }} className="ml-4 text-[var(--dashboard-accent)]">Back to 1000s</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dashboard-bg)]">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
        <Link
          to="/"
          state={{ returnTo: "casino" }}
          className="flex items-center gap-2 text-sm font-medium text-[var(--dashboard-muted)] hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to 1000s
        </Link>
        <span className="text-base font-semibold text-white">{config.title}</span>
        <div className="w-20" aria-hidden />
      </header>

      {config.built && config.iframeSrc ? (
        <iframe
          title={config.title}
          src={config.iframeSrc}
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
