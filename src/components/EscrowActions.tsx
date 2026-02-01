'use client';
import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { keccak256, toBytes, createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { publicClient } from '@/lib/viem';

export function EscrowReleaseButton({ orderIdStr }: { orderIdStr: string }) {
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleRelease = async () => {
    if (!address || !connector) return alert('Connect wallet');

    // Network Guard
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
      const orderId = keccak256(toBytes(orderIdStr)) as `0x${string}`;
      const provider = await connector.getProvider() as any;
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      });
      
      const { request } = await publicClient.simulateContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: 'release',
        args: [orderId],
        account: address,
      });
      const hash = await walletClient.writeContract(request);
      setTxHash(hash);
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
