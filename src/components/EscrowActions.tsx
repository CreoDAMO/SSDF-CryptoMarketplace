// /components/EscrowReleaseButton (/components/EscrowActions.tsx)
import { useState } from 'react';
import { useWallet } from '@coinbase/onchainkit'; // Or your wallet hook
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';
import { escrowAbi } from '@/abis/EscrowABI';
import { ethers } from 'ethers';

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS as `0x${string}`;

export function EscrowReleaseButton({ orderIdStr }: { orderIdStr: string }) {
  const { wallet } = useWallet(); // OnchainKit hook
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleRelease = async () => {
    if (!wallet) return alert('Connect wallet');
    setLoading(true);
    try {
      const orderId = ethers.utils.id(orderIdStr) as `0x${string}`;
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(wallet.ethereumProvider), // Assuming EIP-1193
      });
      // Prep & sign
      const { request } = await publicClient.simulateContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: 'release',
        args: [orderId],
        account: wallet.address,
      });
      const hash = await walletClient.writeContract(request);
      setTxHash(hash);
      // Webhook will handle DB/email; poll if needed
    } catch (error) {
      console.error(error);
      alert('Release failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleRelease} disabled={loading}>
      {loading ? 'Releasing...' : 'Confirm Receipt & Release'}
    </button>
  );
}
// Similar for DisputeButton: Change functionName to 'dispute'
