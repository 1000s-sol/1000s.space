import { createContext, useContext, type ReactNode } from "react";

type WalletContextValue = {
  walletConnected: boolean;
  setWalletConnected: (connected: boolean) => void;
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  discordId: string | null;
  xLinked: boolean;
  xUsername: string | null;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  return ctx ?? {
    walletConnected: false,
    setWalletConnected: () => {},
    walletAddress: null,
    setWalletAddress: () => {},
    discordId: null,
    xLinked: false,
    xUsername: null,
  };
}

export function WalletProvider({
  walletConnected,
  setWalletConnected,
  walletAddress,
  setWalletAddress,
  discordId,
  xLinked,
  xUsername,
  children,
}: {
  walletConnected: boolean;
  setWalletConnected: (c: boolean) => void;
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  discordId: string | null;
  xLinked: boolean;
  xUsername: string | null;
  children: ReactNode;
}) {
  return (
    <WalletContext.Provider value={{ walletConnected, setWalletConnected, walletAddress, setWalletAddress, discordId, xLinked, xUsername }}>
      {children}
    </WalletContext.Provider>
  );
}
