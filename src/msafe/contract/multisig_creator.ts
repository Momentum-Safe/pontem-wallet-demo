import { Provider } from "../lib/provider";
import { Network } from "../lib/config";
import { AptosCoinTransferTxnBuilder, AptosEntryTxnBuilder } from "../lib/transaction";
import { Account } from "../types/types";
import { BCS, HexString, TxnBuilderTypes, } from "aptos";
import { Buffer } from "buffer/"; // the trailing slash is important!
import {
    Ed25519Signature,
    SigningMessage,
} from "aptos/dist/transaction_builder/aptos_types";
import {
    SimpleMap, vector
} from "./move_type";

const provider = new Provider(Network.Devnet);


export type CreateWalletTxn = {
    payload: string,
    signatures: SimpleMap<string, string>,
}

export type MultiSigCreation = {
    public_keys: vector<string>,
    nonce: number,
    threshold: number,
    txn: CreateWalletTxn
}

export type PendingMultiSigCreations = {
    nonces: SimpleMap<string, string>,
    creations: SimpleMap<string, MultiSigCreation>
};

export function buildMultiTxs(chainID: number, sn: number, from: HexString, to: HexString, amount: number) {
    return (new AptosCoinTransferTxnBuilder()).from(from)
        .to(to)
        .amount(amount)
        .sequenceNumber(sn)
        .chainId(chainID)
        .expiration(600);
}

export class MultiSig_Creator {
    constructor(public readonly address: HexString) {
    }

    async init_wallet_creation(signer: Account, pubkeys: HexString[], threshold: number, init_balance: number, payload: SigningMessage, signature: Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();
        //const address = (addr: HexString) => TxnBuilderTypes.AccountAddress.fromHex(addr);
        const pubkey = (key: HexString) => ({
            serialize(serializer: BCS.Serializer) {
                serializer.serializeBytes(key.toUint8Array());
            }
        });

        const serializer = new BCS.Serializer();
        BCS.serializeVector(pubkeys.map(key => pubkey(key)), serializer);
        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module('Creator')
            .method('init_wallet_creation')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .args([
                serializer.getBytes(),
                BCS.bcsSerializeU8(threshold),
                BCS.bcsSerializeUint64(init_balance),
                BCS.bcsSerializeBytes(payload),
                BCS.bcsToBytes(signature),
            ])
            .sign(signer);
        console.log('🚀 ~ file: multisig_creator.ts ~ line 76 ~ MultiSig_Creator ~ init_wallet_creation ~ signedTxn', signedTxn)
        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }

    async submit_signature(signer: Account, multisig: HexString, pk_index: number, signature: Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module('Creator')
            .method('submit_signature')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .args([
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(multisig)),
                BCS.bcsSerializeUint64(pk_index),
                BCS.bcsToBytes(signature),
            ])
            .sign(signer);
        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }


    async getAllPendingCreations() {
        const pendings = await provider.backend.getAccountResource(this.address, `${this.address.hex()}::Creator::PendingMultiSigCreations`);
        return pendings.data as PendingMultiSigCreations;
    }

    async getPendingCreationsByMultiSigs(pendings: HexString[]) {
        const allCreations = await this.getAllPendingCreations();
        return allCreations.creations.data.filter(
            ({ key }) => !!pendings.find(pending => pending.hex() == key));
    }

    async getPendingCreationsByMultiSig(pendingMultiSig: HexString) {
        const allCreations = await this.getAllPendingCreations();
        const creation = allCreations.creations.data.find(({ key }) => key == pendingMultiSig.hex())?.value;
        if (!creation) throw "tx not found";
        return creation;
    }

    // convert a nonce to public key
    static noncePubKey(nonce: number) {
        const pubKey = Buffer.alloc(TxnBuilderTypes.Ed25519PublicKey.LENGTH);
        pubKey.writeUInt32LE(nonce, 0);
        return new TxnBuilderTypes.Ed25519PublicKey(pubKey);
    }

    // MomentumSafe public key is a blend of owners and a nonce (as address)
    static computeMultiSigAddress(pubkeys: HexString[], threshold: number, nonce: number): HexString {

        const publicKeys: TxnBuilderTypes.Ed25519PublicKey[] = [];
        pubkeys.forEach((pubkey) => {
            publicKeys.push(
                new TxnBuilderTypes.Ed25519PublicKey(pubkey.toUint8Array())
            );
        });
        publicKeys.push(this.noncePubKey(nonce));
        const multiPubKey = new TxnBuilderTypes.MultiEd25519PublicKey(
            publicKeys, threshold,
        );
        const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(
            multiPubKey
        );

        return authKey.derivedAddress();
    }
}