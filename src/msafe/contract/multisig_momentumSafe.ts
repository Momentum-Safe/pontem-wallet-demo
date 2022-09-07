import {Provider} from "../lib/provider";
import {Network} from "../lib/config";
import {AptosCoinTransferTxnBuilder, AptosEntryTxnBuilder} from "../lib/transaction";
import {Account} from "../types/types";
import {BCS, HexString, TxnBuilderTypes,} from "aptos";
import {Buffer} from "buffer/"; // the trailing slash is important!
import {Ed25519Signature, SigningMessage} from "aptos/dist/transaction_builder/aptos_types";
import {
    SimpleMap, vector
} from "./move_type";

const provider = new Provider(Network.Devnet);

type HexStr = string

export type Info = {
    public_keys: vector<HexStr>, // vector of public_keys
    nonce: string,
    threshold: number,
    metadata: HexStr, // plain text / json / uri
}

export type Momentum = {
    info: Info,
    txnBook: TxnBook,
}

export type TxnBook = {
    tx_hashes: SimpleMap<string, vector<HexStr>>, // nonce => vector<tx hash>
    // sequence number => a list of transactions (with the same sequence number)
    pendings: SimpleMap<string, TransactionType>, // Hash => Tx
}

export type TransactionType = {
    nonce: number,
    payload: HexStr,
    metadata: HexStr, // json or uri
    signatures: SimpleMap<string, HexStr>, // public_key => signature
}



function buildMultiTxs(chainID: number, sn: number, from: HexString, to: HexString, amount: number) {
    return (new AptosCoinTransferTxnBuilder()).from(from)
        .to(to)
        .amount(amount)
        .sequenceNumber(sn)
        .chainId(chainID)
        .expiration(600);
}

export class MultiSig_MomentumSafe {
    constructor(public readonly address: HexString) {
    }

    gen_register_tx(chainID: number, sn: number, from: HexString, metadata: string) {
        const txModuleBuilder = new AptosEntryTxnBuilder();
        return txModuleBuilder
            .contract(this.address)
            .module('MomentumSafe')
            .method('register')
            .from(from)
            .chainId(chainID)
            .sequenceNumber(sn)
            .expiration(600)
            .args([BCS.bcsSerializeStr(metadata)]);
    }

    async init_transaction(signer: Account, multisig: HexString, nonce: number, pk_index: number, payload: SigningMessage, signature: Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module('MomentumSafe')
            .method('init_transaction')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .args([
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(multisig)),
                BCS.bcsSerializeUint64(nonce),
                BCS.bcsSerializeUint64(pk_index),
                BCS.bcsSerializeBytes(payload),
                BCS.bcsToBytes(signature),
            ])
            .sign(signer);
        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }

    async submit_signature(signer: Account, multisig: HexString, pk_index: number, tx_hash: Buffer, signature: Ed25519Signature) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module('MomentumSafe')
            .method('submit_signature')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .args([
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(multisig)),
                BCS.bcsSerializeUint64(pk_index),
                BCS.bcsSerializeBytes(tx_hash),
                BCS.bcsToBytes(signature),
            ])
            .sign(signer);
        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }

    async getPendingTx(multiSig: HexString) {
        const pendings = await provider.backend.getAccountResource(multiSig, `${this.address.hex()}::MomentumSafe::Momentum`);
        return pendings.data as Momentum;
    }


}