'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';
import { publicClient } from '@/lib/viem';

export default function CheckoutForm({ body }: { body?: any }) {
  const { address, connector } = useAccount();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!connector) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/escrow/deposit', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const { calldata } = await res.json();
      
      const provider = await connector.getProvider() as any;
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });
      
      const hash = await walletClient.sendTransaction(calldata);
      setTxHash(hash);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDeposit} disabled={loading || !address}>
      {loading ? 'Depositing...' : 'Deposit to Escrow'}
    </button>
  );
}
