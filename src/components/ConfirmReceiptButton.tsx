'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { keccak256, toBytes, createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { publicClient } from '@/lib/viem';
import useRegretBuffer from '@/hooks/useRegretBuffer';

export function ConfirmReceiptButton({ orderIdStr }: { orderIdStr: string }) {
  const { address, connector } = useAccount();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const regretBuffer = useRegretBuffer();

  const handleConfirm = async () => {
    if (!address || !connector) return alert('Connect wallet');
    if (regretBuffer.isBuffering) return;

    regretBuffer.start(5);
    setLoading(true);

    try {
      const orderId = keccak256(toBytes(orderIdStr)) as `0x${string}`;
      const provider = await connector.getProvider() as any;
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(provider),
      });

      await publicClient.simulateContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: 'release',
        args: [orderId],
        account: address,
      });

      if (regretBuffer.canConfirm) {
        const hash = await walletClient.writeContract({
          address: ESCROW_ADDRESS as `0x${string}`,
          abi: escrowAbi,
          functionName: 'release',
          args: [orderId],
          account: address,
        });
        setTxHash(hash);
      }
    } catch (error) {
      console.error(error);
      alert('Confirmation failed');
    } finally {
      setLoading(false);
      regretBuffer.reset();
    }
  };

  return (
    <div>
      <button onClick={handleConfirm} disabled={loading}>
        {loading ? 'Confirming...' : 'Confirm Receipt & Release'}
      </button>
      {regretBuffer.confirmModal}
      {txHash && <p>Tx Hash: {txHash} - Funds released, NFT minted.</p>}
    </div>
  );
}
