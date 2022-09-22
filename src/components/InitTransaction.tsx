import { useState, useRef } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import {
  buildMultiTxs,
  Info,
} from "../msafe/contract";

const HexBuffer = (hex: string) =>
  Buffer.from(hex.startsWith("0x") ? hex.slice(2) : hex, "hex");

export const InitTransaction = ({
  address,
  info,
}: {
  address: HexString;
  info: Info;
}) => {
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const receiverVal = useRef(null);
  const amountVal = useRef(null);

  const onCreation = async () => {
    const amount = (amountVal.current as any).value as number;
    const receiver = new HexString(
      (receiverVal.current as any).value as string
    );
    const chainId = await signer.provider.getChainId();
    const sn = await signer.provider.getSequenceNumber(address);
    const transferTx = buildMultiTxs(chainId, sn, address, receiver, amount);
    const pk_index = info.public_keys.findIndex(
      (key) => key == signer.publicKey().hex()
    );
    const [signingMessage, [signature]] = await signer.getSigData(
      transferTx.build()
    );
    mMomentumSafe.init_transaction(
      signer,
      address,
      pk_index,
      signingMessage,
      signature
    );
  };
  return (
    <div>
      <h1>Transfer AptsoCoin</h1>
      <input type="text" placeholder="receiver" ref={receiverVal}></input>
      <br />
      <input type="number" placeholder="amount" ref={amountVal}></input>
      <br />
      <button onClick={onCreation}>init creation</button>
    </div>
  );
};
