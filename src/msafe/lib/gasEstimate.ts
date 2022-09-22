const TransactionGasParameters = {
    min_transaction_gas_units: 1_500_000,
    large_transaction_cutoff: 600,
    intrinsic_gas_per_byte: 2_000,
    gas_unit_scaling_factor: 10_000,
};


export function estimateTxDataGas(txSize: number): bigint {
    const exceed = txSize - TransactionGasParameters.large_transaction_cutoff;
    const exceedGas = exceed * TransactionGasParameters.intrinsic_gas_per_byte;
    const min_transaction_fee = TransactionGasParameters.min_transaction_gas_units + exceedGas;
    return BigInt(Math.ceil(min_transaction_fee / TransactionGasParameters.gas_unit_scaling_factor));

}