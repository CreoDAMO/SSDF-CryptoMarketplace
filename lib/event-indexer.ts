import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI'; // Your ABI/address
import Escrow from '@/models/Escrow'; // From lib/models.ts
import Order from '@/models/Order';
import AgentLog from '@/models/AgentLog'; // For audit logging
import { parseAbiItem } from 'viem';
import { sendEmail } from '@/lib/aws-ses'; // Optional: Alert on major desyncs

// Events to index (from contract)
const EVENTS = [
  parseAbiItem('event Deposited(bytes32 indexed orderId, address buyer, uint256 amount)'),
  parseAbiItem('event Released(bytes32 indexed orderId)'),
  parseAbiItem('event Refunded(bytes32 indexed orderId)'),
  parseAbiItem('event Disputed(bytes32 indexed orderId)'),
];

// Main worker function (run via cron or listener)
export async function indexAndReconcileEvents(fromBlock = 'latest' - 1000n) { // Adjustable lookback
  try {
    // Fetch recent logs (batched by event)
    const logs = await publicClient.getLogs({
      address: ESCROW_ADDRESS,
      events: EVENTS,
      fromBlock,
    });

    for (const log of logs) {
      const { eventName, args } = log;
      const orderIdHash = args.orderId; // bytes32
      const orderIdStr = await mapHashToOrderId(orderIdHash); // Implement reverse lookup (e.g., DB search or hash invert)

      if (!orderIdStr) continue; // Skip if no matching DB order

      // Fetch onchain escrow state (source of truth)
      const onchainEscrow = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: 'escrows',
        args: [orderIdHash],
      });

      // Sync DB
      const dbEscrow = await Escrow.findOne({ orderId: orderIdStr });
      if (!dbEscrow) {
        // Rare: Create if missing (e.g., webhook failed)
        await Escrow.create({
          orderId: orderIdStr,
          status: mapStatus(onchainEscrow.status), // Helper: Enum to string
          timeoutDate: new Date(onchainEscrow.timeout * 1000),
          onchain: { /* from log */ },
        });
        await logAction('create_escrow', orderIdStr, 'Reconciled missing entry');
      } else {
        // Reconcile differences
        if (dbEscrow.status !== mapStatus(onchainEscrow.status)) {
          dbEscrow.status = mapStatus(onchainEscrow.status);
          await dbEscrow.save();
          await updateOrderStatus(orderIdStr, dbEscrow.status); // Sync Order
          await logAction('sync_status', orderIdStr, `Updated to ${dbEscrow.status}`);
          // Optional alert
          if (dbEscrow.status === 'refunded') await notifyParties(orderIdStr, 'Refunded');
        }
        // Add other fields if desynced (e.g., timeoutDate)
      }
    }
  } catch (error) {
    console.error('Indexing error:', error);
    await logAction('error', '', error.message); // Sentry if integrated
  }
}

// Helpers
function mapStatus(enumVal) {
  const statuses = ['none', 'deposited', 'disputed', 'released', 'refunded'];
  return statuses[enumVal];
}

async function mapHashToOrderId(hash) {
  // Implement: Search Orders/Escrows for matching onchain.txHash or derive (e.g., if orderIdStr hashed to bytes32)
  const escrow = await Escrow.findOne({ 'onchain.txHash': /* related deposit tx */ });
  return escrow?.orderId;
}

async function updateOrderStatus(orderIdStr, newStatus) {
  await Order.updateOne({ _id: orderIdStr }, { status: newStatus });
}

async function logAction(action, input, output) {
  await AgentLog.create({ action, input, output, createdAt: new Date() }); // UserId optional for system logs
}

async function notifyParties(orderIdStr, event) {
  const order = await Order.findById(orderIdStr).populate('buyerId');
  await sendEmail({ to: order.buyerId.email, subject: `Order Update: ${event}` });
  // Add seller/admin
}

// Usage: Export and call in cron (see below)
