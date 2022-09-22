import { useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { HexString } from "aptos";
import { MultiSig_Creator } from "../msafe/contract";
import { Transaction } from "../msafe/types/types";
import { TransactionType, Info } from "../msafe/contract";

const HexBuffer = (hex: string) => Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');

export const TxnCard = ({
  address,
  info,
  txid,
  txn,
}: {
  address: HexString;
  info: Info;
  txid: string;
  txn: TransactionType;
}) => {
  const signer = useWebWallet();
  const [mCreator, mMomentumSafe, mRegistry] = useContract();

  const getSigData = async () => {
    console.log('getSigData');
    const signingTx = Transaction.deserialize(HexBuffer(txn.payload));
    const pk_index = info.public_keys.findIndex(key => key == signer.publicKey().hex());
    const [, [sig]] = await signer.getSigData(signingTx);
    return {pk_index, sig};
  } 
  const doRegister = async () => {
    console.log('doRegister');
    const signatrues = [...txn.signatures.data];
    if(txn.signatures.data.length == info.threshold - 1) {
        const {sig} = await getSigData();
        signatrues.push({key: signer.publicKey().hex(), value: Buffer.from(sig.value).toString('hex')})
    }
    console.log('sendMultisigTx');
    await signer.sendMultisigTx(txn.payload, info.public_keys, mCreator.noncePubKey(Number(info.nonce)), signatrues, info.threshold);
  }
  const onSign = async () => {
    console.log('onSign');
    //if(info.txn.signatures.data.length >= info.threshold - 1) return doRegister();
    console.log('submit_signature');
    const {pk_index,sig} = await getSigData();
    await mMomentumSafe.submit_signature(signer, address, pk_index, HexBuffer(txid), sig);
  }
  return (
    <>
        <div>TxId: {txid}</div>
      {
        <div>
        <div>sn: 'nonce'</div>
          public keys:
          <ul>
            {info.public_keys.map((pubkey, index) => (
              <li key={index}>
                {signer.publicKey().hex() == pubkey && "*"} {pubkey.slice(2)}
                {!!txn.signatures.data.find((sig) => sig.key == pubkey) ? (
                  "signed"
                ) : signer.publicKey().hex() == pubkey ? (
                  <button onClick={onSign}>sign</button>
                ) : (
                  "waiting"
                )}
              </li>
            ))}
          </ul>
          {txn.signatures.data.length >= info.threshold && <button onClick={doRegister}>execute</button>}
        </div>
      }
    </>
  );
};
