import { HexString, TransactionBuilder, TransactionBuilderMultiEd25519, TxnBuilderTypes } from "aptos";
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

export class TransactionSigned {
  raw: TxnBuilderTypes.SignedTransaction;

  constructor(raw: TxnBuilderTypes.SignedTransaction) {
    this.raw = raw;
  }

  static deserialize(bcsSignedTx: Buffer): TransactionSigned {
    const deserializer = new Deserializer(bcsSignedTx); // skip prefix, see TransactionBuilder.getSigningMessage
    return new TransactionSigned(
      TxnBuilderTypes.SignedTransaction.deserialize(deserializer)
    );
  }

  getSigningMessage() {
    return TransactionBuilder.getSigningMessage(this.raw.raw_txn);
  }
  isMultiSigned() {
    return this.raw.authenticator instanceof TxnBuilderTypes.TransactionAuthenticatorMultiEd25519;
  }
  getAuthenticator() {
    const authenticator = this.raw.authenticator;
    if (authenticator instanceof TxnBuilderTypes.TransactionAuthenticatorEd25519){
      return authenticator;
    }
    if (authenticator instanceof TxnBuilderTypes.TransactionAuthenticatorMultiEd25519){
      return authenticator;
    }
    throw "unsppourt";
  }
  getSignature() {
    if(this.isMultiSigned()) throw "it's a multisigned tx";
    return this.getAuthenticator().signature as TxnBuilderTypes.Ed25519Signature;
  }

  getPubkey() {
    if(this.isMultiSigned()) throw "it's a multisigned tx";
    return this.getAuthenticator().public_key as TxnBuilderTypes.Ed25519PublicKey;
  }

  getSignatures() {
    if(!this.isMultiSigned()) throw "it's not a multisigned tx";
    return this.getAuthenticator().signature as TxnBuilderTypes.MultiEd25519Signature;
  }

  getPubkeys() {
    if(!this.isMultiSigned()) throw "it's not a multisigned tx";
    return this.getAuthenticator().public_key as TxnBuilderTypes.MultiEd25519PublicKey;
  }
}

export class SignedTransaction {}
