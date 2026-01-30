import { createAction } from '@/lib/agent-kit';
import { platformWalletClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { keccak256, toBytes } from 'viem';

export const disputeEscrow = createAction({
  name: 'dispute_escrow',
  description: 'Flag dispute for order',
  parameters: { orderId: 'string', reason: 'string' },
  async handler({ orderId, reason }: { orderId: string; reason: string }) {
    const orderIdHash = keccak256(toBytes(orderId)) as `0x${string}`;
    const hash = await platformWalletClient.writeContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: escrowAbi,
      functionName: 'dispute',
      args: [orderIdHash],
    });
    return { success: true, txHash: hash };
  },
});
