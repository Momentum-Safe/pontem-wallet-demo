import { useMemo } from 'react';
import { MultiSig_Creator, MultiSig_MomentumSafe, MultiSig_Registry } from '../msafe/contract';
import { MSAFE_ADDRESS } from '../msafe/constant';

export function useContract():[MultiSig_Creator, MultiSig_MomentumSafe, MultiSig_Registry] {
    return useMemo(() => [
        new MultiSig_Creator(MSAFE_ADDRESS),
        new MultiSig_MomentumSafe(MSAFE_ADDRESS),
        new MultiSig_Registry(MSAFE_ADDRESS),
    ], []);
}
