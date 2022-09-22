import {AptosAccount, HexString, MaybeHexString, TransactionBuilderEd25519, TxnBuilderTypes} from "aptos";
import {Account, MultiSigOwner, MultiSigWallet, SimpleAddress, Transaction} from "../types/types";
import * as SHA3 from "js-sha3";

import { TransactionBuilder,BCS } from "aptos";

const { TransactionAuthenticatorEd25519, Ed25519PublicKey} = TxnBuilderTypes;

export {HexString} from "aptos";
(window as any).Buffer = Buffer;
(window as any).AptosAccount = AptosAccount;

// SingleWallet is a single-signed wallet account
export class AccountImpl implements Account, MultiSigOwner {

    account: AptosAccount;

    constructor(privateKeyBytes?: Uint8Array | undefined, address?: MaybeHexString) {
        this.account = new AptosAccount(privateKeyBytes, address);
    }

    address(): HexString {
        return this.account.address();
    }

    publicKey(): HexString {
        return this.account.pubKey();
    }

    publicKeyBytes(): BCS.Bytes {
        return this.account.pubKey().toUint8Array();
    }

    sign(txn: Transaction): BCS.Bytes {
        const txnBuilder = new TransactionBuilderEd25519((message: TxnBuilderTypes.SigningMessage) => {
            return this.signFn(message);
        }, this.publicKey().toUint8Array());
        return txnBuilder.sign(txn.raw);
    }

    signFn(message: TxnBuilderTypes.SigningMessage) {
        const sig = this.account.signBuffer(message);
        return new TxnBuilderTypes.Ed25519Signature(sig.toUint8Array());
    }

    getSigData(txn: Transaction): [signing: TxnBuilderTypes.SigningMessage, signature: TxnBuilderTypes.Ed25519Signature[]] {
        const signingMessage = txn.getSigningMessage();
        const sig = this.signFn(signingMessage);
        return [signingMessage, [sig]];
    }

    ownedMultiSigs(): MultiSigWallet[] {
        return [];
    }
}

export class SimpleAddressImpl implements SimpleAddress {

    _publicKey: HexString;
    _authKey: HexString;
    _accountAddress: HexString;

    constructor(publicKey: MaybeHexString) {
        const pub = HexString.ensure(publicKey);
        this._publicKey = pub;
        this._authKey = this.computeAuthKey(pub);
        this._accountAddress = HexString.ensure(this._authKey.hex());
    }

    computeAuthKey(publicKey: HexString): HexString {
        const hash = SHA3.sha3_256.create();
        hash.update(publicKey.toUint8Array());
        hash.update("\x00");
        return new HexString(hash.hex());
    }

    address(): HexString {
        return this._accountAddress;
    }

    publicKey(): HexString {
        return this._publicKey;
    }

    publicKeyBytes(): BCS.Bytes {
        return this._publicKey.toUint8Array();
    }
}


(window as any).AccountImpl = AccountImpl;