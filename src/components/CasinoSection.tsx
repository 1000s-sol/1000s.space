import { useState } from "react";
import { useNavigate } from "react-router-dom";

const GAMES = [
  { id: "slots", name: "Slots", path: "/games/slots", image: "/casino/images/slots.png", built: true },
  { id: "roulette", name: "Roulette", path: "/games/roulette", image: "/casino/images/roulette.png", built: true },
  { id: "blackjack", name: "Black Jack", path: "/games/blackjack", image: "/casino/images/blackjack.png?v=1", built: false },
] as const;

export function CasinoSection() {
  const navigate = useNavigate();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (id: string) => {
    setFailedImages((prev) => new Set(prev).add(id));
  };

  return (
    <div className="w-full flex flex-col px-2 sm:px-0 min-h-0">
      <p className="text-[var(--dashboard-muted)] mb-1 sm:mb-2 text-center flex-shrink-0 text-sm sm:text-base">
        Play using $KNUKL or $BUX to win NFT and token prizes
      </p>
      <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4 text-center flex-shrink-0">Choose your game</h2>
      <div className="flex flex-col">
        <ul className="flex flex-col gap-3 sm:gap-5 list-none p-0 m-0">
          {GAMES.map(({ id, name, path, image, built }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => built && navigate(path)}
                disabled={!built}
                className={`
                  w-full flex items-center justify-center gap-3 sm:gap-6 rounded-xl sm:rounded-2xl border-2 p-3 sm:p-5 transition-all
                  ${built
                    ? "border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] hover:border-[var(--dashboard-accent)]/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] cursor-pointer"
                    : "border-[var(--dashboard-border)]/60 bg-[var(--dashboard-surface)]/60 opacity-70 cursor-not-allowed"}
                `}
                style={built ? undefined : { background: 'var(--dashboard-card)' }}
              >
                {failedImages.has(id) ? (
                  <div className="size-16 sm:size-24 flex-shrink-0 rounded-lg bg-[var(--dashboard-border)] flex items-center justify-center text-[var(--dashboard-muted)] text-xs sm:text-sm" aria-hidden>
                    ?
                  </div>
                ) : (
                  <img
                    src={image}
                    alt=""
                    className="size-16 sm:size-24 object-contain flex-shrink-0 min-[840px]:size-28"
                    aria-hidden
                    onError={() => handleImageError(id)}
                  />
                )}
                {built ? (
                  <span className="text-base sm:text-xl font-medium text-white min-[840px]:text-2xl">{name}</span>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-base sm:text-xl font-medium text-white min-[840px]:text-2xl">{name}</span>
                    <span className="text-sm sm:text-base text-[var(--dashboard-muted)] mt-0.5 sm:mt-1">Coming soon</span>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
