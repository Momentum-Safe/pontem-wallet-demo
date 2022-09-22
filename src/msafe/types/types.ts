import {HexString, TransactionBuilder, TxnBuilderTypes, BCS} from "aptos";
export interface SimpleAddress {
    address(): HexString;

    publicKey(): HexString;

    publicKeyBytes(): BCS.Bytes;
}
type P<T>=T|Promise<T>;
type SigData = [signing: TxnBuilderTypes.SigningMessage, signature: TxnBuilderTypes.Ed25519Signature[]];
export interface Account extends SimpleAddress {
    signFn(message: TxnBuilderTypes.SigningMessage) : P<TxnBuilderTypes.Ed25519Signature|TxnBuilderTypes.MultiEd25519Signature>;
    sign(txn: Transaction): P<BCS.Bytes>;
    
    getSigData(
        txn: Transaction
    ): P<SigData>;
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
    oraw: Buffer;

    constructor(raw: TxnBuilderTypes.RawTransaction, oraw: Buffer) {
        this.raw = raw;
        this.oraw = oraw;
    }

    static deserialize(rawTx: Buffer): Transaction {
        const deserializer = new BCS.Deserializer(rawTx.slice(32)); // skip prefix, see TransactionBuilder.getSigningMessage
        return new Transaction(TxnBuilderTypes.RawTransaction.deserialize(deserializer), rawTx.slice(32));
    }

    getSigningMessage() {
        return TransactionBuilder.getSigningMessage(this.raw);
    }

    show() {
        const raw = this.raw;
        const address = (arr:Uint8Array)=>HexString.fromUint8Array(arr).hex();
        console.log('sender:', address(raw.sender.address));
        console.log('sn:', raw.sequence_number);
        console.log('expiration:', new Date(Number(raw.expiration_timestamp_secs) * 1000).toLocaleString());
        console.log('chain_id:', raw.chain_id);
        console.log('gas_price:', raw.gas_unit_price);
        console.log('max_gas_amount:', raw.max_gas_amount);
        const payload = raw.payload;
        if (payload instanceof TxnBuilderTypes.TransactionPayloadEntryFunction) {
            console.log('tx type: EntryFunction');
            console.log('module_name:', `${address(payload.value.module_name.address.address)}:${payload.value.module_name.name.value}`);
            console.log('function_name:', payload.value.function_name.value);
            console.log('ty_args count:', payload.value.ty_args.length);
            payload.value.ty_args.forEach((targ, index) => {
                if(targ instanceof TxnBuilderTypes.TypeTagStruct) {
                    // for coin transfer, it shoule be AptosCoin
                    console.log(index, `${address(targ.value.address.address)}:${targ.value.module_name.value}:${targ.value.name.value}`, targ.value.type_args.length); // full logic need recursion 
                }
            });
            console.log('args count:', payload.value.args.length);
            payload.value.args.forEach((arg, index) => { // need abi
                switch(index) {
                    // only work for coin transfer
                    case 0:// for coin transfer, first argument is reveiver
                        console.log('to:', address(TxnBuilderTypes.AccountAddress.deserialize(new BCS.Deserializer(arg)).address));
                        break;
                    case 1: // amount
                        console.log('amount:', (new BCS.Deserializer(arg)).deserializeU64());
                        break;
                }
            });
        }
        
    }
}

export class SignedTransaction {
}
