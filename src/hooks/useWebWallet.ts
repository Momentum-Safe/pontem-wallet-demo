import { useEffect, useMemo } from "react";
import { useWallet } from "@manahippo/aptos-wallet-adapter";
import { WebAccount } from "../msafe/lib/webAccount";

export function useWebWallet(): WebAccount {
  const walletContext = useWallet();
  // useEffect(() => {
  //   async function getAccount() {
  //     const res = await window.pontem.connect();
  //     console.log(
  //       "🚀 ~ file: useWebWallet.ts ~ line 14 ~ getAccount ~ res",
  //       res
  //     );
  //     walletContext.account!.publicKey = res.publicKey;
  //   }
  //   getAccount();
  // }, []);
  return useMemo(() => new WebAccount(walletContext), [walletContext]);
}
