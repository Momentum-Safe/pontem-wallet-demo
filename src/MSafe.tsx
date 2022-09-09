/* eslint-disable */
import { useState, useEffect, useMemo } from "react";
import { useContract } from "./hooks/useContract";
import { useWebWallet } from "./hooks/useWebWallet";
import { CreateWallet } from "./components/CreateWallet";
import { OwnedWallet } from "./components/OwnedWallet";
import useInterval from "./hooks/useInterval";
import { useCallback } from "react";
import { PendingCreations } from "./components/PendingCreations";
import { HexString } from "aptos";

import { MSAFE_ADDRESS_STRING } from "./msafe/constant";

export const MSafe = () => {
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const [registryInfo, setRegistryInfo] = useState({
    inited: false,
    registed: false,
    pending: [] as string[],
    owned: [] as string[],
  });

  const signer = useWebWallet();
  const updateCallback = useCallback(async () => {
    // console.log("updateCallback");
    const response = await window.martian.connect();
    // console.log(
    //   "🚀 ~ file: MSafe.tsx ~ line 26 ~ updateCallback ~ response",
    //   response
    // );
    const sender = response.address;
    mRegistry
      .getOwnerMomentumSafes(sender)
      .then((momentum) => {
        // console.log("momentum:", momentum, registryInfo);
        const newInfo = setRegistryInfo({
          inited: true,
          registed: true,
          pending: momentum.pendings,
          owned: momentum.msafes,
        });
      })
      .catch((e) => {
        if (e.errorCode == "resource_not_found") {
          setRegistryInfo({
            inited: true,
            registed: false,
            pending: [],
            owned: [],
          });
        }
      });
  }, [mRegistry, signer]);

  useInterval(updateCallback, 10000);

  const onRegister = async () => {
    console.log("register...");
    let acc = signer;
    await mRegistry.fundAndCheck(acc, 2_000_000);
    const response = await window.martian.connect();
    const sender = response.address;
    const payload = {
      function: `${MSAFE_ADDRESS_STRING}::Registry::register`,
      type_arguments: [],
      arguments: [],
    };
    const transaction = await window.martian.generateTransaction(
      sender,
      payload
    );
    const txnHash = await window.martian.signAndSubmitTransaction(transaction);

    // await mRegistry.register(acc);
  };
  return (
    <div>
      <div>{registryInfo.inited}</div>
      <span> Address: {signer.address().noPrefix()}</span>
      <br />
      <span> Public key: {signer.publicKey().noPrefix()}</span>
      {registryInfo.inited || <span> Waiting... </span>}
      {registryInfo.inited && !registryInfo.registed && (
        <button className="w-button" onClick={onRegister}>
          {" "}
          Register{" "}
        </button>
      )}
      {registryInfo.inited && registryInfo.registed && (
        <div>
          <span>{registryInfo.pending.length}</span>
          <p />
          <span>{registryInfo.owned.length}</span>
          <CreateWallet />
        </div>
      )}
      {registryInfo.inited && (
        <PendingCreations
          pendings={registryInfo.pending.map(
            (pending) => new HexString(pending)
          )}
        />
      )}
      {registryInfo.inited && (
        <OwnedWallet
          owned={registryInfo.owned.map((pending) => new HexString(pending))}
        />
      )}
    </div>
  );
};
