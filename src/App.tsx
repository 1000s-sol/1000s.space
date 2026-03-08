import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { CasinoSection } from "./components/CasinoSection";
import { ArchivesSection } from "./components/ArchivesSection";
import { HoldersSection } from "./components/HoldersSection";
import { AirdropSection } from "./components/AirdropSection";
import { HomeSection } from "./components/HomeSection";

type MenuId = "home" | "airdrop" | "casino" | "archives" | "holders" | "poker" | "spades" | "team" | "roadmap";

const MENU_TITLES: Record<MenuId, string> = {
  home: "Home",
  airdrop: "Airdrop",
  casino: "Casino",
  archives: "Archives",
  holders: "Holders",
  poker: "Poker",
  spades: "Spades",
  team: "Team",
  roadmap: "Roadmap",
};

function App() {
  const [activeMenu, setActiveMenu] = useState<MenuId>("home");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { returnTo?: string } | null;
    if (location.pathname === "/" && state?.returnTo === "casino") {
      setActiveMenu("casino");
      // Clear state from URL so refresh loads Home, not Casino
      navigate("/", { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const mainContent =
    activeMenu === "airdrop" ? (
      <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-[var(--dashboard-border)] p-6 shadow-[inset_0_1px_0_var(--dashboard-border-light),0_4px_24px_rgba(0,0,0,0.25)] overflow-auto" style={{ background: 'var(--dashboard-card)' }}>
        <h1 className="text-3xl min-[840px]:text-4xl font-semibold text-white mb-2 flex-shrink-0">
          {MENU_TITLES[activeMenu]}
        </h1>
        <p className="text-[var(--dashboard-muted)] mb-4 flex-shrink-0">
          Claim your daily allocation. Connect your wallet to see your share and claim.
        </p>
        <AirdropSection />
      </div>
    ) : activeMenu === "casino" ? (
      <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-[var(--dashboard-border)] p-6 shadow-[inset_0_1px_0_var(--dashboard-border-light),0_4px_24px_rgba(0,0,0,0.25)]" style={{ background: 'var(--dashboard-card)' }}>
        <h1 className="text-3xl min-[840px]:text-4xl font-semibold text-white mb-4 text-center flex-shrink-0">
          {MENU_TITLES[activeMenu]}
        </h1>
        <CasinoSection />
      </div>
    ) : activeMenu === "archives" ? (
      <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-[var(--dashboard-border)] p-6 shadow-[inset_0_1px_0_var(--dashboard-border-light),0_4px_24px_rgba(0,0,0,0.25)] overflow-auto" style={{ background: 'var(--dashboard-card)' }}>
        <h1 className="text-3xl min-[840px]:text-4xl font-semibold text-white mb-2 flex-shrink-0">
          {MENU_TITLES[activeMenu]}
        </h1>
        <p className="text-[var(--dashboard-muted)] mb-4 flex-shrink-0">
          All unlisted archive collection holders are eligible for $MILLIONS token airdrops upon launch. Holders will also earn ongoing rewards after main collection mint.
        </p>
        <ArchivesSection />
      </div>
    ) : activeMenu === "holders" ? (
      <div className="w-full max-w-4xl flex-1 min-h-0 flex flex-col rounded-2xl border-2 border-[var(--dashboard-border)] p-6 shadow-[inset_0_1px_0_var(--dashboard-border-light),0_4px_24px_rgba(0,0,0,0.25)] overflow-auto" style={{ background: 'var(--dashboard-card)' }}>
        <h1 className="text-3xl min-[840px]:text-4xl font-semibold text-white mb-4 flex-shrink-0">
          {MENU_TITLES[activeMenu]}
        </h1>
        <HoldersSection />
      </div>
    ) : activeMenu === "home" ? (
      <div className="relative w-full max-w-4xl min-h-full flex flex-col">
        <HomeSection onClaimClick={() => setActiveMenu("airdrop")} />
      </div>
    ) : (
      <div className="max-w-2xl rounded-2xl border-2 border-[var(--dashboard-border)] p-6 shadow-[inset_0_1px_0_var(--dashboard-border-light),0_4px_24px_rgba(0,0,0,0.25)]" style={{ background: 'var(--dashboard-card)' }}>
        <h1 className="text-3xl min-[840px]:text-4xl font-semibold text-white mb-4">
          {MENU_TITLES[activeMenu]}
        </h1>
        <p className="text-lg text-[var(--dashboard-muted)]">
          Content for this section will go here.
        </p>
      </div>
    );

  return (
    <Dashboard activeMenu={activeMenu} onMenuChange={setActiveMenu}>
      {mainContent}
    </Dashboard>
  );
}

export default App;
