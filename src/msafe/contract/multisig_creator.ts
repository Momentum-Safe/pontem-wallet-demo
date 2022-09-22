import { Provider } from "../lib/provider";
import { Network } from "../lib/config";
import { AptosCoinTransferTxnBuilder, AptosEntryTxnBuilder } from "../lib/transaction";
import { Account } from "../types/types";
import { BCS, HexString, TxnBuilderTypes, } from "aptos";
import {
    SimpleMap
} from "./move_type";

const provider = new Provider(Network.Devnet);

type CreateWalletTxn = {
    payload: string,
    signatures: SimpleMap<string>,
}

export type MultiSigCreation = {
    owners: string[],
    public_keys: string[],
    nonce: number,
    threshold: number,
    txn: CreateWalletTxn
}

type PendingMultiSigCreations = {
    nonces: SimpleMap<string>,
    creations: SimpleMap<MultiSigCreation>
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
    static ModuleName = 'creator';
    constructor(public readonly address: HexString) {
    }

    async init_wallet_creation(signer: Account, owners: HexString[], threshold: number, init_balance: number, payload: TxnBuilderTypes.SigningMessage, signature: TxnBuilderTypes.Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();
        const address = (addr: HexString) => TxnBuilderTypes.AccountAddress.fromHex(addr);

        const serializer = new BCS.Serializer();
        BCS.serializeVector(owners.map(owner => address(owner)), serializer);
        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module(MultiSig_Creator.ModuleName)
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

    async submit_signature(signer: Account, multisig: HexString, pk_index: number, signature: TxnBuilderTypes.Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module(MultiSig_Creator.ModuleName)
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
        const pendings = await provider.backend.getAccountResource(this.address, `${this.address.hex()}::${MultiSig_Creator.ModuleName}::PendingMultiSigCreations`);
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
    noncePubKey(nonce: number) {
        const pubKey = Buffer.alloc(TxnBuilderTypes.Ed25519PublicKey.LENGTH);
        Buffer.from(this.address.toUint8Array()).copy(pubKey, 0, 0, 16);
        pubKey.writeUInt32LE(nonce, 16);
        return new TxnBuilderTypes.Ed25519PublicKey(pubKey);
    }

    // MomentumSafe public key is a blend of owners and a nonce (as address)
    computeMultiSigAddress(pubkeys: HexString[], threshold: number, nonce: number): HexString {

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