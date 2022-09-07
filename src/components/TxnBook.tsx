import { useCallback, useEffect, useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import useInterval from "../hooks/useInterval";
import { MultiSigCreation } from "../msafe/contract";
import { CreationCard } from "./CreationCard";
import { Momentum } from "../msafe/contract";
import { TxnCard } from "./TxnCard";

export const TxnBook = ({
  address,
  info,
}: {
  address: HexString;
  info: Momentum;
}) => {
  const txnBook = info.txnBook;
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const [pendingInfo, setPendingInfo] = useState(
    {} as { [key: string]: MultiSigCreation }
  );

  return (
    <div>
      <h2> Txn Book </h2>
      <ul>
        {txnBook.pendings.data.map(({ key: TxId, value: Txn }, index) => (
          <li key={index}>
            <>
              <div>{"=".repeat(64) + index}</div>
              <TxnCard
                address={address}
                info={info.info}
                txid={TxId}
                txn={Txn}
              />
            </>
          </li>
        ))}
      </ul>
    </div>
  );
};
