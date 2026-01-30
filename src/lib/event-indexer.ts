import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { Escrow, Order, AgentLog } from '@/lib/models';
import { parseAbiItem } from 'viem';

const EVENTS = [
  parseAbiItem('event Deposited(bytes32 indexed orderId, address buyer, uint256 amount)'),
  parseAbiItem('event Released(bytes32 indexed orderId)'),
  parseAbiItem('event Refunded(bytes32 indexed orderId)'),
  parseAbiItem('event Disputed(bytes32 indexed orderId)'),
];

export async function indexAndReconcileEvents(fromBlock?: bigint) {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const startBlock = fromBlock ?? (blockNumber > BigInt(1000) ? blockNumber - BigInt(1000) : BigInt(0));

    const logs = await publicClient.getLogs({
      address: ESCROW_ADDRESS as `0x${string}`,
      events: EVENTS,
      fromBlock: startBlock,
    });

    for (const log of logs) {
      const { eventName, args } = log as any;
      const orderIdHash = args?.orderId;
      if (!orderIdHash) continue;
      
      const orderIdStr = await mapHashToOrderId(orderIdHash);
      if (!orderIdStr) continue;

      const onchainEscrow = await publicClient.readContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: 'escrows',
        args: [orderIdHash],
      }) as any;

      const dbEscrow = await Escrow.findOne({ orderId: orderIdStr });
      if (!dbEscrow) {
        await Escrow.create({
          orderId: orderIdStr,
          status: mapStatus(onchainEscrow.status),
          timeoutDate: new Date(Number(onchainEscrow.timeout) * 1000),
          onchain: {},
        });
        await logAction('create_escrow', orderIdStr, 'Reconciled missing entry');
      } else {
        if (dbEscrow.status !== mapStatus(onchainEscrow.status)) {
          dbEscrow.status = mapStatus(onchainEscrow.status);
          await dbEscrow.save();
          await updateOrderStatus(orderIdStr, dbEscrow.status);
          await logAction('sync_status', orderIdStr, `Updated to ${dbEscrow.status}`);
          if (dbEscrow.status === 'refunded') await notifyParties(orderIdStr, 'Refunded');
        }
      }
    }
  } catch (error: any) {
    console.error('Indexing error:', error);
    await logAction('error', '', error?.message || 'Unknown error');
  }
}

function mapStatus(enumVal: number): string {
  const statuses = ['none', 'deposited', 'disputed', 'released', 'refunded'];
  return statuses[enumVal] || 'none';
}

async function mapHashToOrderId(hash: string): Promise<string | null> {
  const escrow = await Escrow.findOne({ 'onchain.txHash': hash });
  return escrow?.orderId || null;
}

async function updateOrderStatus(orderIdStr: string, newStatus: string) {
  await Order.updateOne({ _id: orderIdStr }, { status: newStatus });
}

async function logAction(action: string, input: string, output: string) {
  await AgentLog.create({ action, input, output, createdAt: new Date() });
}

async function notifyParties(orderIdStr: string, event: string) {
  const order = await Order.findById(orderIdStr).populate('buyerId') as any;
  if (order?.buyerId?.email) {
    console.log(`Would send email to ${order.buyerId.email}: Order Update: ${event}`);
  }
}
