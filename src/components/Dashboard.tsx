import { useState, useEffect } from "react";
import {
  Home,
  Gift,
  Dices,
  Users,
  Map,
  Wallet,
  MoreHorizontal,
  X,
  BarChart3,
} from "lucide-react";
import { WalletProvider } from "../context/WalletContext";
import { ArchivesIcon } from "./icons/ArchivesIcon";
import { PokerChipIcon } from "./icons/PokerChipIcon";
import { SpadesIcon } from "./icons/SpadesIcon";
import { DiscordIcon } from "./icons/DiscordIcon";

const MENU_ITEMS = [
  { id: "home", label: "Home", icon: Home },
  { id: "airdrop", label: "Airdrop", icon: Gift },
  { id: "casino", label: "Casino", icon: Dices },
  { id: "archives", label: "Archives", icon: ArchivesIcon },
  { id: "holders", label: "Holders", icon: BarChart3 },
  { id: "poker", label: "Poker", icon: PokerChipIcon },
  { id: "spades", label: "Spades", icon: SpadesIcon },
  { id: "team", label: "Team", icon: Users },
  { id: "roadmap", label: "Roadmap", icon: Map },
] as const;

const MAIN_MENU = MENU_ITEMS.slice(0, 4);
const MORE_MENU = MENU_ITEMS.slice(4);

type MenuId = (typeof MENU_ITEMS)[number]["id"];

export function Dashboard({
  activeMenu,
  onMenuChange,
  children,
}: {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  children: React.ReactNode;
}) {
  const [walletConnected, setWalletConnected] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Use visual viewport height so we fit in the visible area when browser bar (e.g. at top) is present; no sidebar scroll
  const [appHeight, setAppHeight] = useState(() =>
    typeof window !== "undefined" && window.visualViewport
      ? window.visualViewport.height
      : typeof window !== "undefined"
        ? window.innerHeight
        : 100
  );
  useEffect(() => {
    const update = () => {
      const h =
        window.visualViewport ? window.visualViewport.height : window.innerHeight;
      setAppHeight(h);
      document.documentElement.style.setProperty("--window-height", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      document.documentElement.style.removeProperty("--window-height");
    };
  }, []);

  const sidebarNav = (
      <nav className="flex flex-col gap-1" aria-label="Main">
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onMenuChange(id)}
            className={`
              flex items-center gap-2 text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border
              ${activeMenu === id
                ? "text-white border-indigo-500/60 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                : "text-[var(--dashboard-muted)] border-transparent hover:bg-white/5 hover:text-[var(--dashboard-text)] hover:border-[var(--dashboard-border-light)]"}
            `}
            style={activeMenu === id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(168,85,247,0.25) 100%)' } : undefined}
          >
            <Icon className="flex-shrink-0 size-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    );
  const sidebarButtons = (
      <div className="flex flex-col gap-2 border-t-2 border-[var(--dashboard-border)] pt-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setWalletConnected((c) => !c)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 hover:shadow-[0_0_16px_var(--dashboard-glow)] transition-all"
        >
          <Wallet className="flex-shrink-0 size-4" aria-hidden />
          {walletConnected ? "Disconnect" : "Connect"}
        </button>
        <button
          type="button"
          onClick={() => setDiscordConnected((c) => !c)}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium border-2 border-[#6b7cff]/80 text-white hover:border-[#7c8dff] transition-all"
          style={{ background: 'linear-gradient(135deg, #5865F2 0%, #7c3aed 50%, #6d28d9 100%)' }}
        >
          <DiscordIcon className="flex-shrink-0 size-4" />
          {discordConnected ? "Logout" : "Login"}
        </button>
      </div>
    );

  return (
    <WalletProvider walletConnected={walletConnected} setWalletConnected={setWalletConnected}>
    <div
      data-dashboard-root
      className="flex flex-col overflow-hidden min-[840px]:flex-row"
      style={{ height: appHeight }}
    >
      {/* Landscape: sidebar — fixed height, no scroll. 100svh = visible viewport when browser bar (e.g. top) is shown. */}
      <aside className="hidden min-[840px]:flex w-64 flex-shrink-0 flex-col h-full border-r-2 border-[var(--dashboard-border)] shadow-[4px_0_24px_rgba(0,0,0,0.4)]" style={{ background: 'var(--dashboard-surface-gradient)' }}>
        <div className="px-3 pt-3 pb-0.5 border-b-2 border-[var(--dashboard-border)] bg-gradient-to-b from-[#2a2a38] via-[#1e1e28] to-transparent flex-shrink-0">
          <div className="flex items-center justify-center overflow-hidden h-10 min-[840px]:h-11">
            <img src="/images/1000s-logo.png" alt="1000s" className="h-16 w-auto object-contain object-center min-[840px]:h-20 scale-[1.6]" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 border-r border-[var(--dashboard-border)]/50">
          {sidebarNav}
        </div>
        <div className="p-3 border-r border-[var(--dashboard-border)]/50 flex-shrink-0">
          {sidebarButtons}
        </div>
      </aside>

      {/* Main content — only this area scrolls. Nav stays pinned to viewport bottom (flex-1 here). */}
      <main className="flex-1 flex flex-col min-h-0 min-[840px]:min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-auto p-4 pt-[max(0.25rem,env(safe-area-inset-top))] min-[840px]:p-6 min-[840px]:pt-[max(0.5rem,env(safe-area-inset-top))] pb-5 min-[840px]:pb-8" data-home-content={activeMenu === "home" || undefined}>
          {children}
        </div>

        {/* Portrait / narrow: bottom dashboard nav — pinned to viewport bottom */}
        <div className="min-[840px]:hidden flex-shrink-0 flex flex-col border-t-2 border-[var(--dashboard-border)] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] safe-area-pb" style={{ background: 'linear-gradient(0deg, #1a1a22 0%, #121218 100%)' }}>
          <nav className="flex items-center justify-around py-3 px-3 gap-1" aria-label="Main">
            {MAIN_MENU.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onMenuChange(id)}
                className={`
                  flex flex-col items-center gap-1 flex-1 min-w-0 px-2 py-3 rounded-xl text-sm font-medium transition-all border
                  ${activeMenu === id ? "text-white border-indigo-500/60" : "text-[var(--dashboard-muted)] border-transparent"}
                `}
                style={activeMenu === id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(168,85,247,0.25) 100%)' } : undefined}
              >
                <Icon className="size-5 flex-shrink-0" aria-hidden />
                <span className="w-full text-center text-xs whitespace-nowrap">{label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`
                flex flex-col items-center gap-1 flex-1 min-w-0 px-2 py-3 rounded-xl text-sm font-medium transition-all border
                ${moreOpen || MORE_MENU.some((m) => m.id === activeMenu) ? "text-white border-indigo-500/60" : "text-[var(--dashboard-muted)] border-transparent"}
              `}
              style={moreOpen || MORE_MENU.some((m) => m.id === activeMenu) ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(168,85,247,0.25) 100%)' } : undefined}
            >
              <MoreHorizontal className="size-5 flex-shrink-0" aria-hidden />
              <span className="w-full text-center text-xs whitespace-nowrap">More</span>
            </button>
          </nav>
        </div>

        {/* More panel overlay (mobile only) */}
        {moreOpen && (
          <>
            <div
              className="min-[840px]:hidden fixed inset-0 bg-black/60 z-40"
              aria-hidden
              onClick={() => setMoreOpen(false)}
            />
            <div
              className="min-[840px]:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t-2 border-[var(--dashboard-border)] p-5 max-h-[70vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #1e1e28 0%, #16161e 50%, #121218 100%)',
                paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
              }}
              role="dialog"
              aria-label="More options"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold text-white flex items-center gap-2">
                  <MoreHorizontal className="size-5" aria-hidden />
                  More
                </span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--dashboard-muted)] hover:text-white border border-[var(--dashboard-border)]"
                >
                  <X className="size-4" aria-hidden />
                  Close
                </button>
              </div>
              <nav className="flex flex-col gap-1.5 mb-6">
                {MORE_MENU.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onMenuChange(id);
                      setMoreOpen(false);
                    }}
                    className={`
                      flex items-center gap-3 text-left px-5 py-3.5 rounded-xl text-base font-medium transition-all border
                      ${activeMenu === id ? "text-white border-indigo-500/60" : "text-[var(--dashboard-muted)] border-transparent hover:bg-white/5 hover:text-[var(--dashboard-text)]"}
                    `}
                    style={activeMenu === id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(168,85,247,0.25) 100%)' } : undefined}
                  >
                    <Icon className="flex-shrink-0 size-5" aria-hidden />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="flex flex-col gap-3 border-t-2 border-[var(--dashboard-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setWalletConnected((c) => !c)}
                  className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 transition-all"
                >
                  <Wallet className="flex-shrink-0 size-5" aria-hidden />
                  {walletConnected ? "Disconnect" : "Connect"}
                </button>
                <button
                  type="button"
                  onClick={() => setDiscordConnected((c) => !c)}
                  className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[#6b7cff]/80 text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #5865F2 0%, #7c3aed 50%, #6d28d9 100%)' }}
                >
                  <DiscordIcon className="flex-shrink-0 size-5" />
                  {discordConnected ? "Logout" : "Login"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
    </WalletProvider>
  );
}
