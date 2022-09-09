import { useMemo } from "react";
import { useWallet } from "@manahippo/aptos-wallet-adapter";
import { WebAccount } from "../msafe/lib/webAccount";

export function useWebWallet(): WebAccount {
  const walletContext = useWallet();
  return useMemo(() => new WebAccount(walletContext), [walletContext]);
}
