import { connectToDB } from '@/lib/mongoose';
import { Dispute } from '@/lib/models';
import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { notFound } from 'next/navigation';
import ClientDisputeDetail from './ClientDisputeDetail';

async function getDispute(orderId: string) {
  await connectToDB();
  const dispute = await Dispute.findOne({ orderId });
  if (!dispute) return null;

  let escrowData = null;
  try {
    const data = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: escrowAbi,
      functionName: 'escrows',
      args: [orderId as `0x${string}`],
    }) as [string, string, bigint, bigint, number, boolean, string, bigint];

    escrowData = {
      buyer: data[0],
      seller: data[1],
      amount: data[2].toString(),
      timeout: data[3].toString(),
      status: data[4],
      isNFT: data[5],
      tokenURI: data[6],
      royaltyBps: data[7].toString(),
    };
  } catch (e) {
    console.error('Error reading escrow:', e);
  }

  return {
    dispute: {
      orderId: dispute.orderId,
      buyerAddress: dispute.buyerAddress,
      sellerAddress: dispute.sellerAddress,
      buyerClaim: dispute.buyerClaim,
      sellerResponse: dispute.sellerResponse,
      status: dispute.status,
      createdAt: dispute.createdAt?.toISOString(),
      updatedAt: dispute.updatedAt?.toISOString(),
      aiAnalysis: dispute.aiAnalysis ? {
        recommendation: dispute.aiAnalysis.recommendation,
        confidence: dispute.aiAnalysis.confidence,
        reasoning: dispute.aiAnalysis.reasoning,
        model: dispute.aiAnalysis.model,
        createdAt: dispute.aiAnalysis.createdAt?.toISOString(),
      } : null,
      adminAction: dispute.adminAction ? {
        action: dispute.adminAction.action,
        adminAddress: dispute.adminAction.adminAddress,
        txHash: dispute.adminAction.txHash,
        actedAt: dispute.adminAction.actedAt?.toISOString(),
      } : null,
    },
    escrowData,
  };
}

export default async function DisputeDetailPage({ 
  params 
}: { 
  params: Promise<{ orderId: string }> 
}) {
  const { orderId } = await params;
  const data = await getDispute(orderId);
  
  if (!data) {
    notFound();
  }

  return <ClientDisputeDetail dispute={data.dispute} escrowData={data.escrowData} />;
}
