import { useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { useRef } from "react";
import { HexString } from "aptos";
import { Provider } from "../msafe/lib/provider";
import { MultiSig_Creator } from "../msafe/contract";

export const CreateWallet = () => {
  const signer = useWebWallet();
  const [pubkeys, setPubkeys] = useState([signer.publicKey()]);
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const walletNameVal = useRef(null);
  const inputVal = useRef(null);
  const thresholdVal = useRef(null);
  const nonceVal = useRef(null);
  const initBalanceVal = useRef(null);
  const onAddPubkey = () => {
    const val = (inputVal.current as any).value as string;
    if (val.length != 64) return;
    if (pubkeys.find((a) => a.noPrefix() == val)) return;
    setPubkeys([...pubkeys, new HexString(val)]);
  };
  const onCreation = async () => {
    const threshold = (thresholdVal.current as any).value as number;
    const initBalance = (initBalanceVal.current as any).value as number;
    const nonce = (nonceVal.current as any).value as number;
    const walletName = (walletNameVal.current as any).value as string;
    console.log(threshold);
    const chainId = await signer.provider.getChainId();
    const multiaddr = MultiSig_Creator.computeMultiSigAddress(pubkeys, threshold, nonce);
    const registerTx = mMomentumSafe.gen_register_tx(chainId, 0, multiaddr, walletName);
    const [signingMessage, [signature]] = await signer.getSigData(registerTx.build());
    mCreator.init_wallet_creation(signer, pubkeys, threshold, initBalance, signingMessage, signature);
  }
  return (
    <div>
      <h1>Create New Wallet</h1>
      <span>public keys</span>
      <ol>
        {pubkeys.map((pubkey, index) => (
          <li key={index}>{pubkey.noPrefix()}</li>
        ))}
      </ol>
      <input type="text" placeholder="wallet name" ref={walletNameVal}></input><br/>
      <input type="number" placeholder="nonce" ref={nonceVal}></input><br/>
      <input type="text" placeholder="public key" ref={inputVal}></input>
      <button onClick={onAddPubkey}>add key</button>
      <br/>
      <input type="number" placeholder="threshold" ref={thresholdVal}></input>
      <input type="number" placeholder="init balance" ref={initBalanceVal}></input>
      <button onClick={onCreation}>init creation</button>
        <br/>
      <button onClick={()=>setPubkeys([signer.publicKey()])}>clean</button>
    </div>
  );
};
