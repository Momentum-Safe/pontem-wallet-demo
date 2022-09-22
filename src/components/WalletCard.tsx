import { useWebWallet } from "../hooks/useWebWallet";
import { HexString } from "aptos";
import { Momentum } from "../msafe/contract";

import { TxnBook } from "./TxnBook";
import { InitTransaction } from "./InitTransaction";
const HexBuffer = (hex: string) => Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');

export const WalletCard = ({
  address,
  info,
}: {
  address: HexString;
  info: Momentum;
}) => {
  const signer = useWebWallet(); 
  return (
    <>
        <div>address: {address.hex()}</div>
      {info && (
        <div>
        <div>nonce: {info.info.nonce}</div>
        <div>threshold: {info.info.threshold}</div>
          public keys:
          <ul>
            {info.info.public_keys.map((pubkey, index) => (
              <li key={index}>
                {signer.publicKey().hex() == pubkey && "*"} {pubkey.slice(2)}
              </li>
            ))}
          </ul>
          <InitTransaction address={address} info = {info.info}/>
          <TxnBook address={address} info = {info}></TxnBook>
        </div>
      )}
    </>
  );
};
