// /components/BatchReleaseButton.tsx (New Component for Batch Release with Paymaster)
'use client';
import { useState } from 'react';
import { useWallet } from '@coinbase/onchainkit';
import { ethers } from 'ethers';
import { getSponsoredClient } from '@/lib/viem'; // Import sponsored client
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import useRegretBuffer from '@/hooks/useRegretBuffer';

export function BatchReleaseButton({ orderIdsStr }: { orderIdsStr: string[] }) { // Array of order ID strings
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const regretBuffer = useRegretBuffer();

  const handleBatchRelease = async () => {
    if (!wallet) return alert('Connect wallet');
    if (regretBuffer.isBuffering) return;

    regretBuffer.start(5); // Enforce Regret Buffer
    setLoading(true);

    try {
      const orderIds = orderIdsStr.map(id => ethers.utils.id(id) as `0x${string}`); // Convert to bytes32[]

      // Use sponsored client for gas-free batch
      const sponsoredClient = getSponsoredClient(wallet);

      // Prep batch request
      const { request } = await publicClient.simulateContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: 'batchRelease',
        args: [orderIds],
        account: wallet.address,
      });

      // Send as sponsored user operation
      if (regretBuffer.canConfirm) {
        const hash = await sponsoredClient.sendUserOperation(request);
        setTxHash(hash);
        // Wait for confirm if needed; webhook handles sync
      }
    } catch (error) {
      console.error(error);
      alert('Batch release failed - fallback to user-paid if needed');
      // Optional fallback: Use standard client
    } finally {
      setLoading(false);
      regretBuffer.reset();
    }
  };

  return (
    <div>
      <button onClick={handleBatchRelease} disabled={loading || orderIdsStr.length === 0}>
        {loading ? 'Releasing Batch...' : `Release Batch (${orderIdsStr.length})`}
      </button>
      {regretBuffer.confirmModal} {/* Secondary confirm from hook */}
      {txHash && <p>Batch Tx Hash: {txHash} - Funds released atomically.</p>}
    </div>
  );
}
