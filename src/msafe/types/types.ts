import { HexString, TransactionBuilder, TxnBuilderTypes } from "aptos";
import { BCS } from "aptos";
import {
  Ed25519Signature,
  MultiEd25519Signature,
  SigningMessage,
} from "aptos/dist/transaction_builder/aptos_types";

type Bytes = BCS.Bytes;
const Deserializer = BCS.Deserializer;

import { Buffer } from "buffer/"; // the trailing slash is important!
export interface SimpleAddress {
  address(): HexString;

  publicKey(): HexString;

  publicKeyBytes(): Bytes;
}

type PublicKey = Ed25519Signature | MultiEd25519Signature;
type SigData = [signing: SigningMessage, signature: Ed25519Signature[]];
export interface Account extends SimpleAddress {
  signFn(
    message: TxnBuilderTypes.SigningMessage
  ): PublicKey | Promise<PublicKey>;
  sign(txn: Transaction): Bytes | Promise<Bytes>;

  getSigData(
    txn: Transaction
  ): SigData | Promise<SigData>;
}

export interface MultiSigOwner extends Account {
  ownedMultiSigs(): MultiSigWallet[];
}

export interface MultiSigWallet {
  owners: Account[];
  threshold: number;

  numPendingTxn(): number;
}

export class Transaction {
  raw: TxnBuilderTypes.RawTransaction;

  constructor(raw: TxnBuilderTypes.RawTransaction) {
    this.raw = raw;
  }

  static deserialize(rawTx: Buffer): Transaction {
    const deserializer = new Deserializer(rawTx.slice(32)); // skip prefix, see TransactionBuilder.getSigningMessage
    return new Transaction(
      TxnBuilderTypes.RawTransaction.deserialize(deserializer)
    );
  }

  getSigningMessage() {
    return TransactionBuilder.getSigningMessage(this.raw);
  }
}

export class SignedTransaction {}
