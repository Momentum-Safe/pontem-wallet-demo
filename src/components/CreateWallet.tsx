import { useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { useRef } from "react";
import { HexString } from "aptos";
import { Provider } from "../msafe/lib/provider";
import { MultiSig_Creator } from "../msafe/contract";

export const CreateWallet = () => {
  const signer = useWebWallet();
  const [owners, setOwners] = useState([{address:signer.address(), pubkey:signer.publicKey()}]);
  const [mCreator, mMomentumSafe, mRegistry] = useContract();
  const walletNameVal = useRef(null);
  const inputVal = useRef(null);
  const thresholdVal = useRef(null);
  const nonceVal = useRef(null);
  const initBalanceVal = useRef(null);
  const onAddOwner = async () => {
    let val = (inputVal.current as any).value as string;
    if(val.startsWith('0x')) val = val.slice(2);
    if (val.length != 64) return;
    if (owners.find((owner) => owner.address.noPrefix() == val)) return;
    const newOwner = new HexString(val);
    const theMsafe = await mRegistry.getOwnerMomentumSafes(newOwner);
    setOwners([...owners, {address: newOwner, pubkey: new HexString(theMsafe.public_key)}]);
  };
  const onCreation = async () => {
    const threshold = (thresholdVal.current as any).value as number;
    const initBalance = (initBalanceVal.current as any).value as number;
    const nonce = (nonceVal.current as any).value as number;
    const walletName = (walletNameVal.current as any).value as string;
    console.log(threshold);
    const chainId = await signer.provider.getChainId();
    const multiaddr = mCreator.computeMultiSigAddress(owners.map(owner=>owner.pubkey), threshold, nonce);
    const registerTx = mMomentumSafe.gen_register_tx(chainId, 0, multiaddr, walletName);
    const [signingMessage, [signature]] = await signer.getSigData(registerTx.build());
    mCreator.init_wallet_creation(signer, owners.map(owner=>owner.address), threshold, initBalance, signingMessage, signature);
  }
  return (
    <div>
      <h1>Create New Wallet</h1>
      <span>owners (address:pubkey)</span>
      <ol>
        {owners.map((owner, index) => (
          <li key={index}>{owner.address.noPrefix()}:{owner.pubkey.noPrefix()}</li>
        ))}
      </ol>
      <input type="text" placeholder="wallet name" ref={walletNameVal}></input><br/>
      <input type="number" placeholder="nonce" ref={nonceVal}></input><br/>
      <input type="text" placeholder="owner" ref={inputVal}></input>
      <button onClick={onAddOwner}>add key</button>
      <br/>
      <input type="number" placeholder="threshold" ref={thresholdVal}></input>
      <input type="number" placeholder="init balance" ref={initBalanceVal}></input>
      <button onClick={onCreation}>init creation</button>
        <br/>
      <button onClick={()=>setOwners([{address:signer.address(), pubkey:signer.publicKey()}])}>clean</button>
    </div>
  );
};
