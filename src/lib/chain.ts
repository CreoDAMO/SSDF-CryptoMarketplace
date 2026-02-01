import { base, baseSepolia } from 'viem/chains';

export const CHAIN =
  process.env.NEXT_PUBLIC_CHAIN === 'mainnet'
    ? base
    : baseSepolia;

export const CHAIN_ID = CHAIN.id;
