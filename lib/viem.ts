// /lib/viem.ts (Shared)
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const chain = baseSepolia; // Switch to base for prod
const rpcUrl = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Platform signer for backend ops (e.g., deposit)
const platformAccount = privateKeyToAccount(process.env.PLATFORM_PRIVATE_KEY as `0x${string}`);

// Wallet client for backend (if needed)
export const platformWalletClient = createWalletClient({
  account: platformAccount,
  chain,
  transport: http(rpcUrl),
});
