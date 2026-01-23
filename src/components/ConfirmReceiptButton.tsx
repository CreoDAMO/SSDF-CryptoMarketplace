// src/components/ConfirmReceiptButton.tsx (Extend EscrowReleaseButton for fulfillment)
'use client';
import { useState } from 'react';
import { useWallet } from '@coinbase/onchainkit';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains'; // Mainnet; switch to sepolia for test
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import useRegretBuffer from '@/hooks/useRegretBuffer';
import { ethers } from 'ethers';

export function ConfirmReceiptButton({ orderIdStr }: { orderIdStr: string }) {
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const regretBuffer = useRegretBuffer();

  const handleConfirm = async () => {
    if (!wallet) return alert('Connect wallet');
    if (regretBuffer.isBuffering) return;

    regretBuffer.start(5); // 5s buffer per canon
    setLoading(true);

    try {
      const orderId = ethers.utils.id(orderIdStr) as `0x${string}`;
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(wallet.ethereumProvider),
      });

      // Simulate (viem)
      await publicClient.simulateContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: 'release',
        args: [orderId],
        account: wallet.address,
      });

      // Execute with buffer confirm
      if (regretBuffer.canConfirm) {
        const hash = await walletClient.writeContract({
          address: ESCROW_ADDRESS,
          abi: escrowAbi,
          functionName: 'release',
          args: [orderId],
        });
        setTxHash(hash);
        // Webhook handles DB/email/NFT mint
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
      {regretBuffer.confirmModal} {/* From hook */}
      {txHash && <p>Tx Hash: {txHash} - Funds released, NFT minted.</p>}
    </div>
  );
}
