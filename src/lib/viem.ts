import { createPublicClient, http, createWalletClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const chain = baseSepolia;
const rpcUrl = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Platform signer for backend ops (e.g., deposit)
const platformPrivateKey = process.env.PLATFORM_PRIVATE_KEY;
const platformAccount = platformPrivateKey 
  ? privateKeyToAccount(platformPrivateKey as `0x${string}`)
  : null;

export const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS as `0x${string}`; // Multi-sig backend reference

// Wallet client for backend (if needed)
export const platformWalletClient = platformAccount 
  ? createWalletClient({
      account: platformAccount,
      chain,
      transport: http(rpcUrl),
    })
  : null;

// Sponsored client placeholder
export const getSponsoredClient = (userWallet: any) => {
  console.warn('Sponsored client not yet implemented');
  return null;
};
