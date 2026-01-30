import { NextRequest, NextResponse } from 'next/server';
import { keccak256, toBytes } from 'viem';
import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDB } from '@/lib/mongoose';

export async function POST(req: NextRequest) {
  await connectToDB();
  const { userId } = getAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { orderIdStr, seller, amount, timeout, isNFT, tokenURI, royaltyBps } = body;
  const orderId = keccak256(toBytes(orderIdStr)) as `0x${string}`;
  
  try {
    const calldata = await publicClient.prepareTransactionRequest({
      to: ESCROW_ADDRESS as `0x${string}`,
      data: '0x', // placeholder - actual encoding would use encodeFunctionData
    });
    return NextResponse.json({ calldata });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Deposit prep failed' }, { status: 500 });
  }
}
