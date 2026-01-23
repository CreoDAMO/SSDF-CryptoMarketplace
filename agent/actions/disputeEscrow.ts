import { createAction } from '@coinbase/agent-kit';

export const disputeEscrow = createAction({
  name: 'dispute_escrow',
  description: 'Flag dispute for order',
  parameters: { orderId: 'string', reason: 'string' },
  async handler({ orderId, reason }) {
    // Gate: Check user is buyer, status deposited
    const hash = await platformWalletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: 'dispute',
      args: [ethers.utils.id(orderId)],
    });
    // Log to AgentLog + DB evidence
    return { success: true, txHash: hash };
  },
});
