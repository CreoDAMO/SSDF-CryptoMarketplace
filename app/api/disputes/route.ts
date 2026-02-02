import { getAuth } from '@clerk/nextjs/server';
import { Dispute, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { orderId, buyerClaim } = await req.json();
    if (!orderId || !buyerClaim) {
      return NextResponse.json({ error: 'orderId and buyerClaim are required' }, { status: 400 });
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existingDispute = await Dispute.findOne({ orderId });
    if (existingDispute) {
      return NextResponse.json({ error: 'Dispute already exists for this order' }, { status: 409 });
    }

    const escrowData = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: escrowAbi,
      functionName: 'escrows',
      args: [orderId as `0x${string}`],
    }) as [string, string, bigint, bigint, number, boolean, string, bigint];

    const dispute = new Dispute({
      orderId,
      buyerAddress: escrowData[0].toLowerCase(),
      sellerAddress: escrowData[1].toLowerCase(),
      buyerClaim: buyerClaim.trim(),
      status: 'OPEN',
    });

    await dispute.save();

    return NextResponse.json({ success: true, dispute: dispute.toObject() });
  } catch (err: any) {
    console.error('Create dispute error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findOne({ clerkId: userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userAddress = user.walletAddress?.toLowerCase();
    const disputes = await Dispute.find({
      $or: [{ buyerAddress: userAddress }, { sellerAddress: userAddress }]
    }).sort({ createdAt: -1 });

    return NextResponse.json(disputes.map(d => d.toObject()));
  } catch (err: any) {
    console.error('Get disputes error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
