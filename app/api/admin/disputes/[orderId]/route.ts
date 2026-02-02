import { getAuth } from '@clerk/nextjs/server';
import { Dispute, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId } = await params;
    const dispute = await Dispute.findOne({ orderId });
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    let escrowData = null;
    try {
      escrowData = await publicClient.readContract({
        address: ESCROW_ADDRESS as `0x${string}`,
        abi: escrowAbi,
        functionName: 'escrows',
        args: [orderId as `0x${string}`],
      });
    } catch (e) {
      console.error('Error reading escrow:', e);
    }

    return NextResponse.json({ 
      dispute: dispute.toObject(), 
      escrowData: escrowData ? {
        buyer: escrowData[0],
        seller: escrowData[1],
        amount: escrowData[2].toString(),
        timeout: escrowData[3].toString(),
        status: escrowData[4],
        isNFT: escrowData[5],
        tokenURI: escrowData[6],
        royaltyBps: escrowData[7].toString(),
      } : null
    });
  } catch (err: any) {
    console.error('Get dispute detail error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId } = await params;
    const { action, txHash } = await req.json();

    if (!['REFUND', 'RELEASE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const dispute = await Dispute.findOne({ orderId });
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (!['OPEN', 'AI_REVIEWED'].includes(dispute.status)) {
      return NextResponse.json({ error: 'Dispute cannot be resolved in current state' }, { status: 400 });
    }

    dispute.adminAction = {
      action,
      adminAddress: user.walletAddress,
      txHash: txHash || '',
      actedAt: new Date(),
    };
    dispute.status = 'RESOLVED';
    await dispute.save();

    return NextResponse.json({ success: true, dispute: dispute.toObject() });
  } catch (err: any) {
    console.error('Resolve dispute error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
