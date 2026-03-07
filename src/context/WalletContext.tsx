import { createContext, useContext, type ReactNode } from "react";

type WalletContextValue = {
  walletConnected: boolean;
  setWalletConnected: (connected: boolean) => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet() {
  const ctx = useContext(WalletContext);
  return ctx ?? { walletConnected: false, setWalletConnected: () => {} };
}

export function WalletProvider({
  walletConnected,
  setWalletConnected,
  children,
}: {
  walletConnected: boolean;
  setWalletConnected: (c: boolean) => void;
  children: ReactNode;
}) {
  return (
    <WalletContext.Provider value={{ walletConnected, setWalletConnected }}>
      {children}
    </WalletContext.Provider>
  );
}
