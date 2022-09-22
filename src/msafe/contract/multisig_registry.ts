import {Provider} from "../lib/provider";
import {Network} from "../lib/config";
import { AptosEntryTxnBuilder} from "../lib/transaction";
import {Account} from "../types/types";
import { HexString, BCS} from "aptos";

const provider = new Provider(Network.Devnet);

type vector<T> = T[]
type address = string

type OwnerMomentumSafes = {
    public_key: string,
    pendings: vector<address>,
    msafes: vector<address>
};
export class MultiSig_Registry {
    static ModuleName = 'registry';
    constructor(public readonly address: HexString) {
    }

    async register(signer: Account) {
        const chainID = await provider.getChainId();
        const sn = await provider.getSequenceNumber(signer);
        const txModuleBuilder = new AptosEntryTxnBuilder();

        const signedTxn = await txModuleBuilder
            .contract(this.address)
            .module(MultiSig_Registry.ModuleName)
            .method('register')
            .from(signer.address())
            .chainId(chainID)
            .sequenceNumber(sn)
            .args([
                BCS.bcsSerializeBytes(signer.publicKeyBytes())
            ])
            .sign(signer);

        console.log('---------------------:Registry::register', signer.address().hex(), signer.publicKey().noPrefix());

        const res = await provider.sendSignedTransactionAndWait(signedTxn);
        console.log(res.hash, res.success, res.vm_status);
    }

    async getOwnerMomentumSafes(multiSig: HexString): Promise<OwnerMomentumSafes> {
        const ownerMomentumSafes = await provider.backend.getAccountResource(multiSig, `${this.address.hex()}::${MultiSig_Registry.ModuleName}::OwnerMomentumSafes`);
        return ownerMomentumSafes.data as OwnerMomentumSafes;
    }

    async fundAndCheck (acc: Account, amount: number) {
        await provider.fundAccount(acc, amount);
        const balance = await provider.getBalance(acc);
        console.log(acc.address().hex(), balance, amount);
    };

}