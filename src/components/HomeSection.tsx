import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import "./HomeSection.css";

const PAIR_COUNT = 10;
const MIN_DURATION = 6;
const MAX_DURATION = 14;
const MIN_DELAY = 0;
const MAX_DELAY = 4;
const MIN_SIZE = 16;
const MAX_SIZE = 26;
const MIN_DISTANCE_PCT = 18;

function rand(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

function useEyePairs() {
  return useMemo(() => {
    return Array.from({ length: PAIR_COUNT }, (_, i) => {
      const s = (i * 9311 + 17) % 100000;
      return {
        id: i,
        size: MIN_SIZE + (s % (MAX_SIZE - MIN_SIZE + 1)),
        duration: MIN_DURATION + rand(s) * (MAX_DURATION - MIN_DURATION),
        delay: rand(s + 1) * MAX_DELAY,
        opacityPeak: 0.3 + rand(s + 2) * 0.5,
      };
    });
  }, []);
}

function EyePair({
  id,
  left,
  top,
  size,
  duration,
  delay,
  opacityPeak,
  onCycle,
}: {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacityPeak: number;
  onCycle: (id: number) => void;
}) {
  const el = useRef<HTMLSpanElement>(null);
  const onCycleRef = useRef(onCycle);
  onCycleRef.current = onCycle;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const handleIteration = () => onCycleRef.current(id);
    node.addEventListener("animationiteration", handleIteration);
    return () => node.removeEventListener("animationiteration", handleIteration);
  }, [id]);

  const eyeR = size * 0.3;
  const pupilR = eyeR * 0.45;
  const highlightR = eyeR * 0.2;
  const pairWidth = size * 1.4;
  const pairHeight = size * 0.85;
  const cx1 = size * 0.28;
  const cx2 = size * 1.12;
  const cy = pairHeight * 0.5;

  return (
    <span
      ref={el}
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: pairWidth,
        height: pairHeight,
        animation: `eye-fade ${duration}s ease-in-out ${delay}s infinite`,
        transform: "translate(-50%, -50%)",
        // @ts-expect-error CSS custom property for keyframes
        "--eye-peak": opacityPeak,
      }}
      aria-hidden
    >
      <svg
        width={pairWidth}
        height={pairHeight}
        viewBox={`0 0 ${pairWidth} ${pairHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 0 6px rgba(99,102,241,0.35))" }}
      >
        <circle cx={cx1} cy={cy} r={eyeR} fill="rgba(250,250,255,0.98)" stroke="rgba(99,102,241,0.5)" strokeWidth="0.8" />
        <circle cx={cx1} cy={cy} r={pupilR} fill="rgba(30,30,45,0.95)" />
        <circle cx={cx1 + highlightR} cy={cy - highlightR} r={highlightR} fill="rgba(255,255,255,0.95)" />
        <circle cx={cx2} cy={cy} r={eyeR} fill="rgba(250,250,255,0.98)" stroke="rgba(99,102,241,0.5)" strokeWidth="0.8" />
        <circle cx={cx2} cy={cy} r={pupilR} fill="rgba(30,30,45,0.95)" />
        <circle cx={cx2 + highlightR} cy={cy - highlightR} r={highlightR} fill="rgba(255,255,255,0.95)" />
      </svg>
    </span>
  );
}

function distance(a: { left: number; top: number }, b: { left: number; top: number }) {
  return Math.hypot(a.left - b.left, a.top - b.top);
}

const ARCHIVE_ARTWORK = [
  "https://gateway.pinata.cloud/ipfs/QmTnN17xMMzoNorQxbKnK4qCdeXhEMpiChX9dvKpSoCkDN",
  "https://tke7vlv3z75fadvfapy5kn2qiiytkmtprl3pdw5lhss3pzupx2cq.arweave.net/mon6rrvP-lAOpQPx1TdQQjE1Mm-K9vHbqzylt-aPvoU?ext=png",
  "https://6azfy6ozkboxe7gzuavgqhfos3lbbiq4d3pj52gptrsek22oxvma.arweave.net/8DJcedlQXXJ82aAqaByultYQohwe3p7oz5xkRWtOvVg?ext=png",
  "https://gateway.pinata.cloud/ipfs/QmZFn4JxMPXLpWbLqf2rwa72kZo1bLLqmixRLAJnWzVP31",
];

type HomeSectionProps = {
  onClaimClick?: () => void;
};

export function HomeSection({ onClaimClick }: HomeSectionProps) {
  const pairs = useEyePairs();
  const [positions, setPositions] = useState<Map<number, { left: number; top: number }>>(() => new Map());

  const getRandomPositionAwayFrom = useCallback(
    (existing: Map<number, { left: number; top: number }>, excludeId: number | null): { left: number; top: number } => {
      const others = Array.from(existing.entries())
        .filter(([id]) => id !== excludeId)
        .map(([, pos]) => pos);
      for (let attempt = 0; attempt < 80; attempt++) {
        const pos = { left: 5 + Math.random() * 90, top: 5 + Math.random() * 90 };
        if (others.every((o) => distance(pos, o) >= MIN_DISTANCE_PCT)) return pos;
      }
      return { left: 10 + Math.random() * 80, top: 10 + Math.random() * 80 };
    },
    []
  );

  const initPositions = useCallback(() => {
    setPositions((prev) => {
      const next = new Map(prev);
      const current: Map<number, { left: number; top: number }> = new Map(next);
      pairs.forEach((p) => {
        if (!next.has(p.id)) {
          const pos = getRandomPositionAwayFrom(current, null);
          next.set(p.id, pos);
          current.set(p.id, pos);
        }
      });
      return next;
    });
  }, [pairs, getRandomPositionAwayFrom]);

  useEffect(() => {
    initPositions();
  }, [initPositions]);

  const handleCycle = useCallback(
    (id: number) => {
      setPositions((prev) => {
        const next = new Map(prev);
        const pos = getRandomPositionAwayFrom(next, id);
        next.set(id, pos);
        return next;
      });
    },
    [getRandomPositionAwayFrom]
  );

  const getFallbackPos = useCallback(
    (id: number) => ({
      left: 10 + (id * 23) % 75,
      top: 10 + (id * 37) % 75,
    }),
    []
  );

  return (
    <div className="relative w-full flex flex-col min-h-0 flex-1 overflow-visible home-section-root">
      <div className="absolute inset-0 min-h-full overflow-visible pointer-events-none" style={{ zIndex: 0 }} aria-hidden>
        {pairs.map((p) => {
          const pos = positions.get(p.id) ?? getFallbackPos(p.id);
          return (
            <EyePair
              key={p.id}
              id={p.id}
              left={pos.left}
              top={pos.top}
              size={p.size}
              duration={p.duration}
              delay={p.delay}
              opacityPeak={p.opacityPeak}
              onCycle={handleCycle}
            />
          );
        })}
      </div>

      <header className="relative z-10 w-full flex flex-col items-center gap-1 min-[840px]:gap-2 pt-4 min-[840px]:pt-10 px-2 min-[840px]:px-4 flex-shrink-0">
        {/* Row 1: [image, title, image]; Row 2: tagline — images closer to title on mobile (gap-1.5) */}
        <div className="flex flex-row items-center justify-center gap-3 min-[840px]:gap-6 w-full min-[840px]:w-auto">
          <div
            className="aspect-square rounded-full overflow-hidden flex-shrink-0"
            style={{
              width: "clamp(56px, 14vw, 140px)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
              maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
            }}
            aria-hidden
          >
            <img src={ARCHIVE_ARTWORK[2]} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
          <h1
            className="font-semibold text-white tracking-tight leading-none select-none flex-shrink-0"
            style={{
              fontSize: "clamp(3.25rem, 12vw, 6rem)",
              textShadow: "0 0 32px rgba(99,102,241,0.2), 0 2px 16px rgba(0,0,0,0.4)",
            }}
          >
            1000s
          </h1>
          <div
            className="aspect-square rounded-full overflow-hidden flex-shrink-0"
            style={{
              width: "clamp(56px, 14vw, 140px)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
              maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
            }}
            aria-hidden
          >
            <img src={ARCHIVE_ARTWORK[3]} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
        </div>
        <p
          className="text-[var(--dashboard-muted)] font-normal tracking-wide text-sm min-[840px]:text-base text-center"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
        >
          &ldquo;where thousands become millions&rdquo;
        </p>
      </header>

      <section className="relative z-10 w-full flex-1 flex flex-col justify-center min-[840px]:justify-start min-[840px]:flex-initial px-2 sm:px-0 py-4 min-[840px]:py-8 home-section-cards-area min-h-0">
        <div className="grid grid-cols-2 min-[840px]:grid-cols-2 gap-4 min-[840px]:gap-6 w-full max-w-5xl mx-auto items-start">
          <div className="col-span-2 min-[840px]:col-span-1 home-section-text-card rounded-2xl border border-[var(--dashboard-border)] p-4 min-[840px]:p-6 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] flex flex-col justify-center">
            <div className="flex gap-3">
              <Info className="flex-shrink-0 size-5 mt-0.5 text-[var(--dashboard-accent)]" aria-hidden />
              <p className="text-[var(--dashboard-text)] text-[15px] min-[840px]:text-base leading-relaxed">
                1000s is a web3 art and gaming community. Holders of our digital collectibles can earn daily rewards through passive holding, community engagement and by playing on our custom built gaming platforms.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[140px] min-[840px]:min-h-[260px]" aria-hidden>
            <div
              className="w-full max-w-[140px] min-[840px]:max-w-[280px] aspect-square rounded-full overflow-hidden"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
                maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
              }}
            >
              <img src={ARCHIVE_ARTWORK[0]} alt="" className="w-full h-full object-cover" loading="eager" decoding="async" />
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[140px] min-[840px]:min-h-[260px]" aria-hidden>
            <div
              className="w-full max-w-[140px] min-[840px]:max-w-[280px] aspect-square rounded-full overflow-hidden"
              style={{
                WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
                maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 35%, transparent 75%)",
              }}
            >
              <img src={ARCHIVE_ARTWORK[1]} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </div>
          </div>
          <div className="col-span-2 min-[840px]:col-span-1 home-section-text-card rounded-2xl border border-[var(--dashboard-border)] p-4 min-[840px]:p-6 text-left shadow-[0_4px_24px_rgba(0,0,0,0.35)] flex flex-col justify-center">
            <p className="text-amber-400/95 text-[15px] min-[840px]:text-base leading-relaxed">
              Our flagship art collection and token launch is scheduled for Q4 2026. Find out how you can secure and maximise your FREE token allocation today.
            </p>
            <button
              type="button"
              onClick={() => onClaimClick?.()}
              className="mt-4 w-full min-[400px]:w-auto px-6 py-3 rounded-xl font-semibold text-amber-400 border border-amber-400/70 bg-amber-400/10 transition-all hover:bg-amber-400/20 hover:border-amber-400/90 hover:shadow-[0_0_16px_rgba(251,191,36,0.2)]"
            >
              Claim your allocation
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes eye-fade {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          8%, 92% { opacity: var(--eye-peak, 0.5); transform: translate(-50%, -50%) scale(1); }
        }
        /* Cards: eyes show through — translucent only, no blur */
        .home-section-text-card {
          background: rgba(26, 26, 34, 0.5) !important;
        }
        .home-section-cards-area,
        .home-section-cards-area .grid {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
