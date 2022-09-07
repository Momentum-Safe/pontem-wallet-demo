import { useCallback, useEffect, useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import useInterval from "../hooks/useInterval";
import { MultiSigCreation } from "../msafe/contract";
import { CreationCard } from "./CreationCard";

export const PendingCreations = ({ pendings }: { pendings: HexString[] }) => {
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const [pendingInfo, setPendingInfo] = useState(
    {} as { [key: string]: MultiSigCreation }
  );
  const updatePendingInfo = useCallback(async () => {
    const infos = await mCreator.getPendingCreationsByMultiSigs(pendings);
    setPendingInfo(
      infos.reduce(
        (t, info) => ((t[info.key] = info.value), t),
        {} as { [key: string]: MultiSigCreation }
      )
    );
  }, [pendings, mCreator]);
  useInterval(updatePendingInfo, 10000);
  return (
    <div>
      <h1> Pending Creations </h1>
      <ul>
        {pendings.map((pending, index) => (
          <li key={index}>
            <>
            <div>{'='.repeat(64) + index}</div>
            <CreationCard address={pending} info={pendingInfo[pending.hex()]}/>
            </>
          </li>
        ))}
      </ul>
    </div>
  );
};
