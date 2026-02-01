'use client';

import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { createWalletClient, custom, keccak256, toBytes } from 'viem';
import { base } from 'viem/chains';
import { publicClient } from '@/lib/viem';

export default function CheckoutForm({ body }: { body?: any }) {
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!connector) return;
    
    // Network Guard: Force Base Mainnet
    if (chainId !== base.id) {
      if (switchChain) {
        switchChain({ chainId: base.id });
        return;
      }
      return alert('Please switch to Base Mainnet');
    }

    if (!address) return alert('Please connect your wallet');
    
    setLoading(true);
    try {
      const orderId = keccak256(toBytes(`order_${Date.now()}`)) as `0x${string}`;
      const res = await fetch('/api/escrow/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          orderIdStr: orderId
        }),
      });
      const { calldata } = await res.json();
      
      const provider = await connector.getProvider() as any;
      const walletClient = createWalletClient({
        chain: base,
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
