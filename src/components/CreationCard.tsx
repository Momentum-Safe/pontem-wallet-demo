import { useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import { MultiSigCreation, MultiSig_Creator } from "../msafe/contract";
import { Transaction } from "../msafe/types/types";
import { Ed25519Signature } from "aptos/dist/generated";

import {Buffer} from "buffer/"; // the trailing slash is important!
const HexBuffer = (hex: string) => Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');

export const CreationCard = ({
  address,
  info,
}: {
  address: HexString;
  info: MultiSigCreation;
}) => {
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();

  const getSigData = async () => {
    console.log('getSigData');
    const signingTx = Transaction.deserialize(HexBuffer(info.txn.payload));
    const pk_index = info.public_keys.findIndex(key => key == signer.publicKey().hex());
    const [, [sig]] = await signer.getSigData(signingTx);
    return {pk_index, sig};
  } 
  const doRegister = async () => {
    console.log('doRegister');
    const signatrues = [...info.txn.signatures.data];
    if(info.txn.signatures.data.length == info.threshold - 1) {
        const {sig} = await getSigData();
        signatrues.push({key: signer.publicKey().hex(), value: Buffer.from(sig.value).toString('hex')})
    }
    console.log('sendMultisigTx');
    await signer.sendMultisigTx(info.txn.payload, info.public_keys, MultiSig_Creator.noncePubKey(info.nonce), signatrues, info.threshold);
  }
  const onSign = async () => {
    console.log('onSign');
    //if(info.txn.signatures.data.length >= info.threshold - 1) return doRegister();
    console.log('submit_signature');
    const {pk_index,sig} = await getSigData();
    await mCreator.submit_signature(signer, address, pk_index, sig);
  }
  return (
    <>
        <div>address: {address.hex()}</div>
      {info && (
        <div>
        <div>nonce: {info.nonce}</div>
        <div>threshold: {info.threshold}</div>
          public keys:
          <ul>
            {info.public_keys.map((pubkey, index) => (
              <li key={index}>
                {signer.publicKey().hex() == pubkey && "*"} {pubkey.slice(2)}
                {!!info.txn.signatures.data.find((sig) => sig.key == pubkey) ? (
                  "signed"
                ) : signer.publicKey().hex() == pubkey ? (
                  <button onClick={onSign}>sign</button>
                ) : (
                  "waiting"
                )}
              </li>
            ))}
          </ul>
          {info.txn.signatures.data.length >= info.threshold && <button onClick={doRegister}>execute</button>}
        </div>
      )}
    </>
  );
};
