import { useCallback, useEffect, useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import useInterval from "../hooks/useInterval";
import { MultiSigCreation } from "../msafe/contract";
import { CreationCard } from "./CreationCard";
import { Momentum } from "../msafe/contract";
import { WalletCard } from "./WalletCard";

export const OwnedWallet = ({ owned }: { owned: HexString[] }) => {
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const [ownedInfos, setOwnedInfos] = useState(
    {} as { [key: string]: Momentum }
  );
  const updatePendingInfo = useCallback(async () => {
    const infos = await Promise.all(owned.map(maddr=>mMomentumSafe.getPendingTx(maddr)))
    setOwnedInfos(
      infos.reduce(
        (t, info, index) => ((t[owned[index].hex()] = info), t),
        {} as { [key: string]: Momentum }
      )
    );
  }, [owned, mCreator]);
  useInterval(updatePendingInfo, 10000);
  return (
    <div>
      <h1> My Msafes </h1>
      <ul>
        {owned.map((mwallet, index) => (
          <li key={index}>
            <>
            <div>{'='.repeat(64) + index}</div>
            <WalletCard address={mwallet} info={ownedInfos[mwallet.hex()]}/>
            </>
          </li>
        ))}
      </ul>
    </div>
  );
};
