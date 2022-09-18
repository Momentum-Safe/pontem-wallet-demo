import { WalletContextState } from "@manahippo/aptos-wallet-adapter";
import { HexString, TxnBuilderTypes, TransactionBuilder, BCS } from "aptos";
import { Transaction } from "../types/types";
import { AccountImpl } from "./account";
import * as SHA3 from "js-sha3";
import { Provider } from "./provider";
import { Network } from "./config";
import { Buffer } from "buffer/"; // the trailing slash is important!

const { TransactionAuthenticatorEd25519, Ed25519PublicKey } = TxnBuilderTypes;
const { bcsToBytes } = BCS;
type Bytes = BCS.Bytes;

export { HexString } from "aptos";

const provider = new Provider(Network.Devnet);

const HexBuffer = (hex: string) =>
  Buffer.from(hex.startsWith("0x") ? hex.slice(2) : hex, "hex");
export class WebAccount {
  fakeAccount: AccountImpl;
  private publicKeyAddressCached!: HexString;
  provider = provider;
  constructor(public readonly wallet: WalletContextState) {
    this.fakeAccount = new AccountImpl(
      HexBuffer(wallet.account!.address!.toString())
    );
  }

  address(): HexString {
    // return this.fakeAccount.address();
    return new HexString(this.wallet.account!.address!.toString());
  }

  publicKey(): HexString {
    // return this.fakeAccount.publicKey();
    console.log(
      "🚀 ~ file: webAccount.ts ~ line 38 ~ WebAccount ~ publicKey ~ this.wallet",
      this.wallet
    );
    return new HexString(this.wallet.account?.publicKey?.toString() || "");
  }

  publicKeyBytes(): Bytes {
    // return this.fakeAccount.publicKeyBytes();
    return this.publicKey().toUint8Array();
  }

  async rawToSigned(
    txn: Transaction
  ): Promise<TxnBuilderTypes.SignedTransaction> {
    const signingMessage = TransactionBuilder.getSigningMessage(txn.raw);
    const signature = await this.signFn(signingMessage);

    const authenticator = new TransactionAuthenticatorEd25519(
      new Ed25519PublicKey(this.publicKeyBytes()),
      signature as TxnBuilderTypes.Ed25519Signature
    );

    return new TxnBuilderTypes.SignedTransaction(txn.raw, authenticator);
  }
  async sign(txn: Transaction): Promise<Bytes> {
    return bcsToBytes(await this.rawToSigned(txn));
  }

  async signFn(message: TxnBuilderTypes.SigningMessage) {
    console.log("signFn...");
    const sig = (await this.wallet.signMessage(
      Buffer.from(message).toString()
    )) as any as { signature?: string; result?: { hexString: string } };
    console.log("---sig:", sig);
    // return this.fakeAccount.signFn(message);
    return new TxnBuilderTypes.Ed25519Signature(
      HexBuffer(sig.signature || sig.result!.hexString).reverse()
    );
  }

  async getSigData(
    txn: Transaction
  ): Promise<
    [
      signing: TxnBuilderTypes.SigningMessage,
      signature: TxnBuilderTypes.Ed25519Signature[]
    ]
  > {
    const signingMessage = txn.getSigningMessage();
    const sig = await this.signFn(signingMessage);
    return [signingMessage, [sig]];
  }

  publicKeyAddress(): HexString {
    if (!this.publicKeyAddressCached) {
      const hash = SHA3.sha3_256.create();
      hash.update(this.publicKeyBytes());
      hash.update("\x00");
      this.publicKeyAddressCached = new HexString(hash.hex());
    }
    return this.publicKeyAddressCached;
  }

  async sendMultisigTx(
    payload: string,
    public_keys: string[],
    noncePubKey: TxnBuilderTypes.Ed25519PublicKey,
    signatures: { key: string; value: string }[],
    threshold: number
  ) {
    console.log(payload);
    console.log(public_keys);
    console.log(noncePubKey.value);
    console.log(signatures);
    console.log(threshold);
    const fullPubkeys = public_keys.map(
      (hexKey) => new Ed25519PublicKey(HexBuffer(hexKey))
    );
    fullPubkeys.push(noncePubKey);
    const bitmap: number[] = [];
    const signaturesUnsorted: [number, TxnBuilderTypes.Ed25519Signature][] = [];
    signatures.forEach(({ key: pubkey, value: signature }) => {
      const pk_index = public_keys.findIndex((key) => key == pubkey);
      bitmap.push(pk_index);
      signaturesUnsorted.push([
        pk_index,
        new TxnBuilderTypes.Ed25519Signature(HexBuffer(signature)),
      ]);
    });
    console.log("bitmap:", bitmap);
    const signaturesSorted = signaturesUnsorted
      .sort((a, b) => a[0] - b[0])
      .map((v) => v[1]);
    const parsedBitmap =
      TxnBuilderTypes.MultiEd25519Signature.createBitmap(bitmap);

    const finalSignature = new TxnBuilderTypes.MultiEd25519Signature(
      signaturesSorted,
      parsedBitmap
    );
    const finalPubkeys = new TxnBuilderTypes.MultiEd25519PublicKey(
      fullPubkeys,
      threshold
    );

    const authenticator =
      new TxnBuilderTypes.TransactionAuthenticatorMultiEd25519(
        finalPubkeys,
        finalSignature
      );

    const signingTx = Transaction.deserialize(HexBuffer(payload));
    (window as any).mtx = signingTx;
    const signedTx = new TxnBuilderTypes.SignedTransaction(
      signingTx.raw,
      authenticator
    );
    const bcsTx = BCS.bcsToBytes(signedTx);
    (window as any).bcstx = bcsTx;
    (window as any).stx = signedTx;
    const res = await provider.sendSignedTransactionAndWait(bcsTx);
    console.log(res.hash, res.success, res.vm_status);
  }
}
