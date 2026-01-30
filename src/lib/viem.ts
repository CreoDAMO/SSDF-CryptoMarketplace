// /lib/viem.ts (Ensure Sponsored Client is Set Up - From Previous Paymaster Code)
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains'; // Switch to base for prod
import { privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient } from '@coinbase/smart-wallet'; // Ensure installed

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

// Sponsored client for gas-free user txs (e.g., batch release)
export const getSponsoredClient = (userWallet: any) => { // Pass user's wallet from OnchainKit
  return createSmartAccountClient({
    transport: http(process.env.PAYMASTER_RPC_URL), // e.g., https://api.pimlico.io/v1/base/rpc?apikey=your-key
    chain,
    sponsorUserOperation: async ({ userOp }) => {
      // Custom sponsorship: Sponsor batch releases for eligible users (e.g., check rep)
      return {
        ...userOp,
        paymasterAndData: '0x' + 'paymaster address and data', // From provider config
      };
    },
  });
};
