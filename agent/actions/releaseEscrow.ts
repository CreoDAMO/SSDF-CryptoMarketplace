import { createAction } from '@/lib/agent-kit';
import { platformWalletClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { keccak256, toBytes } from 'viem';
import { AgentLog } from '@/lib/models';

export const releaseEscrow = createAction({
  name: 'release_escrow',
  description: 'Release funds and NFT from escrow after confirmation',
  parameters: { orderId: { type: 'string', description: 'Order ID string' } },
  async handler({ orderId }: { orderId: string }) {
    if (!platformWalletClient) {
      throw new Error('Platform wallet not configured');
    }
    const orderIdHash = keccak256(toBytes(orderId)) as `0x${string}`;
    const hash = await platformWalletClient.writeContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: escrowAbi,
      functionName: 'release',
      args: [orderIdHash],
    });
    await AgentLog.create({ action: 'release_escrow', input: orderId, output: hash });
    return { success: true, txHash: hash };
  },
});
