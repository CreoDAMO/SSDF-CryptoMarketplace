// src/components/DisputeForm.tsx
'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@coinbase/onchainkit';
import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';

export function DisputeForm({ orderIdStr }: { orderIdStr: string }) {
  const { wallet } = useWallet();
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDispute = async () => {
    if (!wallet) return alert('Connect wallet');
    if (!reason) return alert('Provide reason');

    setLoading(true);
    try {
      const orderId = ethers.utils.id(orderIdStr) as `0x${string}`;
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(wallet.ethereumProvider),
      });

      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: 'dispute',
        args: [orderId],
      });

      // Post-dispute: Upload evidence to API (e.g., /api/disputes/evidence)
      if (evidence) {
        const formData = new FormData();
        formData.append('file', evidence);
        formData.append('orderId', orderIdStr);
        formData.append('reason', reason);
        await fetch('/api/disputes/evidence', { method: 'POST', body: formData });
      }

      alert('Dispute flagged: Tx ' + hash);
    } catch (error) {
      console.error(error);
      alert('Dispute failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        placeholder="Dispute reason..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <input type="file" onChange={(e) => setEvidence(e.target.files?.[0] || null)} />
      <button onClick={handleDispute} disabled={loading}>
        {loading ? 'Flagging...' : 'Flag Dispute'}
      </button>
    </div>
  );
}
