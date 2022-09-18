import { useState } from "react";
import { useWebWallet } from "../hooks/useWebWallet";
import { useContract } from "../hooks/useContract";
import { useRef } from "react";
import { Provider } from "../msafe/lib/provider";
import { MultiSig_Creator } from "../msafe/contract";
import { BCS, HexString, TxnBuilderTypes } from "aptos";
import { Transaction, TransactionSigned } from "../msafe/types/types";
import { Buffer } from "buffer/";

import { MSAFE_ADDRESS_STRING } from "../msafe/constant";

function stringToHex(text: string) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const res = Array.from(encoded, (i) => i.toString(16).padStart(2, "0")).join(
    ""
  );
  return res;
}

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
    console.log(
      "🚀 ~ file: CreateWallet.tsx ~ line 33 ~ onAddPubkey ~ val",
      val
    );
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
    const response = await window.martian.connect();
    const sender = response.address;
    const chainId = await signer.provider.getChainId();
    const multiaddr = MultiSig_Creator.computeMultiSigAddress(
      pubkeys,
      threshold,
      nonce
    );
    console.log(
      "🚀 ~ file: CreateWallet.tsx ~ line 51 ~ onCreation ~ multiaddr",
      multiaddr.hex()
    );
    // const registerTx = mMomentumSafe.gen_register_tx(
    //   chainId,
    //   0,
    //   multiaddr,
    //   walletName
    // );
    const payload = {
      function: `${MSAFE_ADDRESS_STRING}::MomentumSafe::register`,
      type_arguments: [],
      arguments: [Array.from(Buffer.from(walletName))],
    };
    const transactionRequest = await window.martian.generateTransaction(
      sender,
      payload,
      {
        // sequence_number: "0",
        sender: multiaddr,
        max_gas_amount: "12000",
        gas_unit_price: "1",
        gas_currency_code: "XUS",
        // Unix timestamp, in seconds + 10 seconds
        expiration_timestamp_secs: (
          Math.floor(Date.now() / 1000) + 600
        ).toString(),
      }
    );
    const initSignedTxn: string = await window.martian.signTransaction(
      transactionRequest
    );

    const forceSignTxn = initSignedTxn.split(",").map((i: string) => Number(i));

    const signature = TransactionSigned.deserialize(
      Buffer.from(forceSignTxn)
    ).getSignature();

    const signingMessage = TransactionSigned.deserialize(
      Buffer.from(forceSignTxn)
    ).getSigningMessage();
    // const signingMessage = forceSignTxn.slice(0, -64 - 32 - 3);

    // const signTx = [...Array(32).fill(0), ...signingMessage];
    // const finalSigningMessage = Transaction.deserialize(
    //   Buffer.from(signTx)
    // ).getSigningMessage();
    // console.log(
    //   "🚀 ~ file: CreateWallet.tsx ~ line 80 ~ onCreation ~ signature",
    //   signature
    // );
    // console.log(
    //   "🚀 ~ file: CreateWallet.tsx ~ line 75 ~ onCreation ~ signedTxn"
    // );
    // console.log(
    //   "🚀 ~ file: CreateWallet.tsx ~ line 33 ~ onCreation ~ registerTx",
    //   registerTx.build()
    // );

    // const argsHandle = (argsContent: Uint8Array) => {
    //   // let res = stringToHex(new TextDecoder().decode(argsContent));
    //   let res = Buffer.from(argsContent).toString("hex");
    //   return `${res}`;
    // };
    // const pubkey = (key: HexString) => ({
    //   serialize(serializer: BCS.Serializer) {
    //     serializer.serializeBytes(key.toUint8Array());
    //   },
    // });
    // const serializer = new BCS.Serializer();
    // serializer.serializeBytes()
    // BCS.bcsSerializeBytes();
    // BCS.serializeVector(
    //   pubkeys.map((key) => pubkey(key)),
    //   serializer
    // );
    // mCreator.init_wallet_creation(
    //   signer,
    //   pubkeys,
    //   threshold,
    //   initBalance,
    //   signingMessage,
    //   signature
    // );
    const initPayload = {
      function: `${MSAFE_ADDRESS_STRING}::Creator::init_wallet_creation`,
      type_arguments: [],
      arguments: [
        // argsHandle(serializer.getBytes()),
        // argsHandle(BCS.bcsSerializeU8(threshold)),
        // argsHandle(BCS.bcsSerializeUint64(initBalance)),
        // argsHandle(BCS.bcsSerializeBytes(signingMessage)),
        // argsHandle(BCS.bcsToBytes(signature)),
        pubkeys.map((key) => Array.from(key.toUint8Array())),
        // BCS.bcsSerializeU8(threshold),
        threshold,
        // BCS.bcsSerializeUint64(initBalance),
        initBalance,
        Array.from(signingMessage),
        Array.from(signature.value),
        // Array.from(signingMessage),
        // BCS.bcsSerializeBytes(signingMessage),
        // argsHandle(BCS.bcsToBytes(signature)),
        // Array.from(signature.value),
        // argsHandle(signature as any),
      ],
    };
    const transaction = await window.martian.generateTransaction(
      sender,
      initPayload
    );
    console.log(
      "🚀 ~ file: CreateWallet.tsx ~ line 111 ~ onCreation ~ transaction",
      transaction
    );
    const signedTxn = await window.martian.signTransaction(transaction);
    const res = await window.martian.submitTransaction(signedTxn);
  };
  return (
    <div>
      <h1>Create New Wallet</h1>
      <span>public keys</span>
      <ol>
        {pubkeys.map((pubkey, index) => (
          <li key={index}>{pubkey.noPrefix()}</li>
        ))}
      </ol>
      <input type="text" placeholder="wallet name" ref={walletNameVal}></input>
      <br />
      <input type="number" placeholder="nonce" ref={nonceVal}></input>
      <br />
      <input type="text" placeholder="public key" ref={inputVal}></input>
      <button onClick={onAddPubkey}>add key</button>
      <br />
      <input type="number" placeholder="threshold" ref={thresholdVal}></input>
      <input
        type="number"
        placeholder="init balance"
        ref={initBalanceVal}
      ></input>
      <button onClick={onCreation}>init creation</button>
      <br />
      <button onClick={() => setPubkeys([signer.publicKey()])}>clean</button>
    </div>
  );
};
