import {Provider} from "../lib/provider";
import {Network} from "../lib/config";
import { AptosEntryTxnBuilder} from "../lib/transaction";
import {Account} from "../types/types";
import { HexString} from "aptos";

const provider = new Provider(Network.Devnet);

type vector<T> = T[]
type address = string

type OwnerMomentumSafes = {
    pendings: vector<address>,
    msafes: vector<address>
};

export class MultiSig_Registry {
    constructor(public readonly address: HexString) {
    }

    async register(signer: Account) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module('Registry')
            .method('register')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .sign(signer);
        console.log("sendSignedTransactionAndWait:", Buffer.from(signedTxn).toString('hex'));
        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }

    async getOwnerMomentumSafes(multiSig: HexString): Promise<OwnerMomentumSafes> {
        const ownerMomentumSafes = await provider.backend.getAccountResource(multiSig, `${this.address.hex()}::Registry::OwnerMomentumSafes`);
        return ownerMomentumSafes.data as OwnerMomentumSafes;
    }

    async fundAndCheck (acc: Account, amount: number) {
        await provider.fundAccount(acc, amount);
        const balance = await provider.getBalance(acc);
        console.log(acc.address().hex(), balance, amount);
    };

}