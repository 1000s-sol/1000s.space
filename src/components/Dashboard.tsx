import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  LogOut,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletProvider } from "../context/WalletContext";
import { ArchivesIcon } from "./icons/ArchivesIcon";
import { PokerChipIcon } from "./icons/PokerChipIcon";
import { SpadesIcon } from "./icons/SpadesIcon";
import { DiscordIcon } from "./icons/DiscordIcon";
import { XIcon } from "./icons/XIcon";

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

const DISCORD_STORAGE_KEY = "1000s_discord_id";
const DISCORD_USERNAME_KEY = "1000s_discord_username";
const DISCORD_AVATAR_KEY = "1000s_discord_avatar";

function discordAvatarUrl(discordId: string, avatarHash: string | null): string {
  const size = 64; // Discord CDN supports 16, 32, 64, 128, 256, 512, etc.
  if (avatarHash) {
    const ext = avatarHash.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
  }
  return `https://cdn.discordapp.com/embed/avatars/0.png?size=${size}`;
}

export function Dashboard({
  activeMenu,
  onMenuChange,
  children,
}: {
  activeMenu: MenuId;
  onMenuChange: (id: MenuId) => void;
  children: React.ReactNode;
}) {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const linkWalletCalled = useRef<string | null>(null);
  const [discordId, setDiscordId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(DISCORD_STORAGE_KEY);
  });
  const [discordUsername, setDiscordUsername] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(DISCORD_USERNAME_KEY);
  });
  const [discordAvatar, setDiscordAvatar] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(DISCORD_AVATAR_KEY);
  });
  // When custom avatar fails to load, we show default Discord avatar instead of "T"
  const [avatarUseDefault, setAvatarUseDefault] = useState(false);
  const discordConnected = !!discordId;
  const [xLinked, setXLinked] = useState(false);
  const [xUsername, setXUsername] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Persist Discord ID, username, avatar to sessionStorage when they change
  useEffect(() => {
    if (discordId) sessionStorage.setItem(DISCORD_STORAGE_KEY, discordId);
    else sessionStorage.removeItem(DISCORD_STORAGE_KEY);
  }, [discordId]);
  useEffect(() => {
    if (discordUsername != null) sessionStorage.setItem(DISCORD_USERNAME_KEY, discordUsername);
    else sessionStorage.removeItem(DISCORD_USERNAME_KEY);
  }, [discordUsername]);
  useEffect(() => {
    if (discordAvatar != null) sessionStorage.setItem(DISCORD_AVATAR_KEY, discordAvatar);
    else sessionStorage.removeItem(DISCORD_AVATAR_KEY);
  }, [discordAvatar]);

  // Retry custom avatar when hash or id changes (e.g. after login or /api/user/me)
  useEffect(() => {
    setAvatarUseDefault(false);
  }, [discordId, discordAvatar]);

  // Handle return from Discord OAuth (?discord_id=...&discord_username=...&discord_avatar=...)
  useEffect(() => {
    const id = searchParams.get("discord_id");
    if (!id) return;
    setDiscordId(id);
    const name = searchParams.get("discord_username");
    if (name) setDiscordUsername(decodeURIComponent(name));
    const avatar = searchParams.get("discord_avatar");
    if (avatar) setDiscordAvatar(avatar);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("discord_id");
      next.delete("discord_username");
      next.delete("discord_avatar");
      next.delete("discord_error");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Refetch X status when returning from X OAuth (?x_linked=1)
  useEffect(() => {
    if (searchParams.get("x_linked") !== "1") return;
    const params = discordId ? `discordId=${encodeURIComponent(discordId)}` : walletAddress ? `walletAddress=${encodeURIComponent(walletAddress)}` : null;
    if (params) {
      fetch(`/api/user/me?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setXLinked(!!data.xLinked);
          setXUsername(data.xUsername ?? null);
        })
        .catch(() => {});
    }
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("x_linked");
      next.delete("x_error");
      next.delete("x_username");
      return next;
    }, { replace: true });
  }, [searchParams, discordId, walletAddress, setSearchParams]);

  const userMeInFlightRef = useRef<string | null>(null);
  // Fetch user + X status when Discord or wallet is set (so X status and Discord name/avatar work)
  useEffect(() => {
    if (!discordId && !walletAddress) {
      setXLinked(false);
      setXUsername(null);
      return;
    }
    const params = discordId ? `discordId=${encodeURIComponent(discordId)}` : `walletAddress=${encodeURIComponent(walletAddress!)}`;
    if (userMeInFlightRef.current === params) return;
    userMeInFlightRef.current = params;
    fetch(`/api/user/me?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setXLinked(!!data.xLinked);
        setXUsername(data.xUsername ?? null);
        if (data.user?.discordUsername != null) setDiscordUsername(data.user.discordUsername);
        if (data.user?.discordAvatar !== undefined) setDiscordAvatar(data.user.discordAvatar ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (userMeInFlightRef.current === params) userMeInFlightRef.current = null;
      });
  }, [discordId, walletAddress]);

  // Sync Solana wallet adapter to our state and DB (link wallet to Discord user when both present)
  useEffect(() => {
    if (connected && publicKey) {
      const addr = publicKey.toBase58();
      setWalletAddress(addr);
      setWalletConnected(true);
      if (discordId && linkWalletCalled.current !== addr) {
        linkWalletCalled.current = addr;
        fetch("/api/user/link-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discordId, walletAddress: addr }),
        }).catch(() => {});
      }
    } else {
      setWalletAddress(null);
      setWalletConnected(false);
      linkWalletCalled.current = null;
    }
  }, [connected, publicKey, discordId]);

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
      <nav className="flex flex-col gap-1.5" aria-label="Main">
        {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onMenuChange(id)}
            className={`
              flex items-center gap-3 text-left px-5 py-3.5 rounded-xl text-base font-medium transition-all border
              ${activeMenu === id
                ? "text-white border-indigo-500/60 shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                : "text-[var(--dashboard-muted)] border-transparent hover:bg-white/5 hover:text-[var(--dashboard-text)] hover:border-[var(--dashboard-border-light)]"}
            `}
            style={activeMenu === id ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(168,85,247,0.25) 100%)' } : undefined}
          >
            <Icon className="flex-shrink-0 size-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    );
  const sidebarButtons = (
      <div className="flex flex-col gap-3 border-t-2 border-[var(--dashboard-border)] pt-6 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            if (walletConnected) {
              disconnect();
            } else {
              setWalletModalVisible(true);
            }
          }}
          className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 hover:shadow-[0_0_16px_var(--dashboard-glow)] transition-all"
        >
          <Wallet className="flex-shrink-0 size-5" aria-hidden />
          {walletConnected ? (walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)} · Disconnect` : "Disconnect") : "Connect wallet"}
        </button>
        {discordConnected ? (
          <button
            type="button"
            onClick={() => { setDiscordId(null); setDiscordUsername(null); setDiscordAvatar(null); setAvatarUseDefault(false); }}
            className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:text-white transition-all"
          >
            {discordId && (
              <img
                src={discordAvatarUrl(discordId, avatarUseDefault ? null : discordAvatar)}
                alt=""
                referrerPolicy="no-referrer"
                className="size-8 rounded-full flex-shrink-0 object-cover bg-[var(--dashboard-border)]"
                onError={() => setAvatarUseDefault(true)}
              />
            )}
            <span className="min-w-0 truncate">{discordUsername ?? "Discord"}</span>
            <LogOut className="flex-shrink-0 size-5 text-[var(--dashboard-muted)]" aria-hidden />
          </button>
        ) : (
          <a
            href={typeof window !== "undefined" && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")) ? "/api/discord/auth?dev=1" : "/api/discord/auth"}
            className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[#6b7cff]/80 text-white hover:border-[#7c8dff] transition-all"
            style={{ background: "linear-gradient(135deg, #5865F2 0%, #7c3aed 50%, #6d28d9 100%)" }}
          >
            <DiscordIcon className="flex-shrink-0 size-5" />
            Login with Discord
          </a>
        )}
        <div className="flex flex-col gap-1.5">
          {(discordConnected || walletConnected) ? (
            xLinked ? (
              <button
                type="button"
                onClick={() => {
                  const body = discordId ? { discordId } : { walletAddress: walletAddress ?? "" };
                  fetch("/api/airdrop/x-unlink", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data.success && data.unlinked) {
                        setXLinked(false);
                        setXUsername(null);
                      }
                    })
                    .catch(() => {});
                }}
                className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 transition-all"
              >
                <XIcon className="flex-shrink-0 size-5" />
                <span className="min-w-0 truncate">{xUsername ?? "X connected"}</span>
                <LogOut className="flex-shrink-0 size-5 text-[var(--dashboard-muted)]" aria-hidden />
              </button>
            ) : (
              <a
                href={discordId ? `/api/airdrop/x-auth?discordId=${encodeURIComponent(discordId)}` : `/api/airdrop/x-auth?walletAddress=${encodeURIComponent(walletAddress ?? "")}`}
                className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[#1da1f2]/60 bg-[#1da1f2]/20 text-white hover:border-[#1da1f2] hover:bg-[#1da1f2]/30 transition-all"
              >
                <XIcon className="flex-shrink-0 size-5" />
                Connect X
              </a>
            )
          ) : (
            <div
              className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] cursor-not-allowed"
              title="Log in with Discord or connect wallet to link X"
            >
              <XIcon className="flex-shrink-0 size-5" />
              Connect X
            </div>
          )}
          {!(discordConnected || walletConnected) && (
            <p className="text-xs text-[var(--dashboard-muted)] text-center px-1">
              Log in or connect wallet to link
            </p>
          )}
        </div>
      </div>
    );

  return (
    <WalletProvider walletConnected={walletConnected} setWalletConnected={setWalletConnected} walletAddress={walletAddress} setWalletAddress={setWalletAddress} discordId={discordId} xLinked={xLinked} xUsername={xUsername}>
    <div
      data-dashboard-root
      className="flex flex-col overflow-hidden min-[840px]:flex-row"
      style={{ height: appHeight }}
    >
      {/* Landscape: sidebar — fixed height, no scroll. 100svh = visible viewport when browser bar (e.g. top) is shown. */}
      <aside className="hidden min-[840px]:flex w-64 flex-shrink-0 flex-col h-full border-r-2 border-[var(--dashboard-border)] shadow-[4px_0_24px_rgba(0,0,0,0.4)]" style={{ background: 'var(--dashboard-surface-gradient)' }}>
        <div className="px-5 pt-5 pb-1 border-b-2 border-[var(--dashboard-border)] bg-gradient-to-b from-[#2a2a38] via-[#1e1e28] to-transparent flex-shrink-0">
          <div className="flex items-center justify-center overflow-hidden h-12 min-[840px]:h-14">
            <img src="/images/1000s-logo.png" alt="1000s" className="h-20 w-auto object-contain object-center min-[840px]:h-24 scale-[1.6]" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 border-r border-[var(--dashboard-border)]/50">
          {sidebarNav}
        </div>
        <div className="p-4 border-r border-[var(--dashboard-border)]/50 flex-shrink-0">
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
                  onClick={() => {
                    if (walletConnected) disconnect();
                    else setWalletModalVisible(true);
                  }}
                  className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 transition-all"
                >
                  <Wallet className="flex-shrink-0 size-5" aria-hidden />
                  {walletConnected ? "Disconnect" : "Connect wallet"}
                </button>
                {discordConnected ? (
                  <button
                    type="button"
                    onClick={() => { setDiscordId(null); setDiscordUsername(null); setDiscordAvatar(null); setAvatarUseDefault(false); }}
                    className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] transition-all"
                  >
                    {discordId && (
                      <img
                        src={discordAvatarUrl(discordId, avatarUseDefault ? null : discordAvatar)}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-8 rounded-full flex-shrink-0 object-cover bg-[var(--dashboard-border)]"
                        onError={() => setAvatarUseDefault(true)}
                      />
                    )}
                    <span className="min-w-0 truncate">{discordUsername ?? "Discord"}</span>
                    <LogOut className="flex-shrink-0 size-5 text-[var(--dashboard-muted)]" aria-hidden />
                  </button>
                ) : (
                  <a
                    href={typeof window !== "undefined" && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")) ? "/api/discord/auth?dev=1" : "/api/discord/auth"}
                    className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[#6b7cff]/80 text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #5865F2 0%, #7c3aed 50%, #6d28d9 100%)" }}
                  >
                    <DiscordIcon className="flex-shrink-0 size-5" />
                    Login with Discord
                  </a>
                )}
                <div className="flex flex-col gap-1.5">
                  {(discordConnected || walletConnected) ? (
                    xLinked ? (
                      <button
                        type="button"
                        onClick={() => {
                          const body = discordId ? { discordId } : { walletAddress: walletAddress ?? "" };
                          fetch("/api/airdrop/x-unlink", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body),
                          })
                            .then((r) => r.json())
                            .then((data) => {
                              if (data.success && data.unlinked) {
                                setXLinked(false);
                                setXUsername(null);
                              }
                            })
                            .catch(() => {});
                        }}
                        className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] hover:border-[var(--dashboard-accent)]/60 transition-all"
                      >
                        <XIcon className="flex-shrink-0 size-5" />
                        <span className="min-w-0 truncate">{xUsername ?? "X connected"}</span>
                        <LogOut className="flex-shrink-0 size-5 text-[var(--dashboard-muted)]" aria-hidden />
                      </button>
                    ) : (
                      <a
                        href={discordId ? `/api/airdrop/x-auth?discordId=${encodeURIComponent(discordId)}` : `/api/airdrop/x-auth?walletAddress=${encodeURIComponent(walletAddress ?? "")}`}
                        className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[#1da1f2]/60 bg-[#1da1f2]/20 text-white hover:border-[#1da1f2] hover:bg-[#1da1f2]/30 transition-all"
                      >
                        <XIcon className="flex-shrink-0 size-5" />
                        Connect X
                      </a>
                    )
                  ) : (
                    <div
                      className="flex items-center justify-center gap-3 w-full px-5 py-3.5 rounded-xl text-base font-medium border-2 border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] cursor-not-allowed"
                      title="Log in with Discord or connect wallet to link X"
                    >
                      <XIcon className="flex-shrink-0 size-5" />
                      Connect X
                    </div>
                  )}
                  {!(discordConnected || walletConnected) && (
                    <p className="text-xs text-[var(--dashboard-muted)] text-center px-1">
                      Log in or connect wallet to link
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
    </WalletProvider>
  );
}
