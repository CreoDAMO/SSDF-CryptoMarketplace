'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { keccak256, toBytes, createWalletClient, custom } from 'viem';
import { publicClient } from '@/lib/viem';
import { baseSepolia } from 'viem/chains';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import useRegretBuffer from '@/hooks/useRegretBuffer';

export function BatchReleaseButton({ orderIdsStr }: { orderIdsStr: string[] }) {
  const { address, connector } = useAccount();
  const [loading, setLoading] = useState(false);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const regretBuffer = useRegretBuffer();

  const handleBatchRelease = async () => {
    if (!address || !connector) return alert('Connect wallet');
    if (regretBuffer.isBuffering) return;

    regretBuffer.start(5);
    setLoading(true);

    try {
      const provider = await connector.getProvider() as any;
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });

      const hashes: string[] = [];
      for (const orderIdStr of orderIdsStr) {
        const orderId = keccak256(toBytes(orderIdStr)) as `0x${string}`;
        
        if (regretBuffer.canConfirm) {
          const hash = await walletClient.writeContract({
            address: ESCROW_ADDRESS as `0x${string}`,
            abi: escrowAbi,
            functionName: 'release',
            args: [orderId],
            account: address,
          });
          hashes.push(hash);
        }
      }
      setTxHashes(hashes);
    } catch (error) {
      console.error(error);
      alert('Batch release failed');
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
      {regretBuffer.confirmModal}
      {txHashes.length > 0 && <p>Released {txHashes.length} orders.</p>}
    </div>
  );
}
