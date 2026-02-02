import { connectToDB } from '@/lib/mongoose';
import { Dispute } from '@/lib/models';
import ClientDisputeQueue from './ClientDisputeQueue';

async function getDisputes() {
  await connectToDB();
  const disputes = await Dispute.find({ 
    status: { $in: ['OPEN', 'AI_REVIEWED'] } 
  }).sort({ createdAt: 1 });
  return disputes.map(d => ({
    orderId: d.orderId,
    buyerAddress: d.buyerAddress,
    sellerAddress: d.sellerAddress,
    buyerClaim: d.buyerClaim,
    status: d.status,
    createdAt: d.createdAt?.toISOString(),
    aiAnalysis: d.aiAnalysis ? {
      recommendation: d.aiAnalysis.recommendation,
      confidence: d.aiAnalysis.confidence,
    } : null,
  }));
}

export default async function AdminArbitration() {
  const disputes = await getDisputes();
  return <ClientDisputeQueue disputes={disputes} />;
}
