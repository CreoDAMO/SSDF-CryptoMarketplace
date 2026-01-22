// src/components/CheckoutForm.tsx (New - User-signed deposit)
import { useState } from 'react';
import { useWallet } from '@coinbase/onchainkit';
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';
import { publicClient } from '@/lib/viem';

export function CheckoutForm({ body }) { // body from form
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escrow/deposit', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const { calldata } = await res.json();
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(wallet.ethereumProvider),
      });
      const hash = await walletClient.sendTransaction(calldata); // User signs
      setTxHash(hash);
      // Poll receipt or webhook for DB update
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDeposit} disabled={loading}>
      {loading ? 'Depositing...' : 'Deposit to Escrow'}
    </button>
  );
}
