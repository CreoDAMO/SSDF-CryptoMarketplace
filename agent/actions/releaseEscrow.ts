// /agent/actions/releaseEscrow.ts
import { createAction } from '@coinbase/agent-kit';
import { platformWalletClient } from '@/lib/viem';
import { escrowAbi } from '@/abis/EscrowABI';
import { ethers } from 'ethers';

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`;

export const releaseEscrow = createAction({
  name: 'release_escrow',
  description: 'Release funds and NFT from escrow after confirmation',
  parameters: { orderId: { type: 'string', description: 'Order ID string' } },
  async handler({ orderId }) {
    const orderIdHash = ethers.utils.id(orderId) as `0x${string}`;
    const hash = await platformWalletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: 'release',
      args: [orderIdHash],
    });
    // Optional: Log to DB
    await AgentLog.create({ action: 'release_escrow', input: orderId, output: hash });
    return { success: true, txHash: hash };
  },
});
