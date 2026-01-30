import { NextResponse } from 'next/server';
import { ethers } from 'ethers'; // For utils
import { publicClient } from '@/lib/viem';
import { escrowAbi } from '@/abis/EscrowABI';
import { getAuth } from '@clerk/nextjs/server';
import { connectToDB } from '@/lib/mongoose'; // Add this

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`;

export async function POST(req: Request) {
  await connectToDB(); // Singleton guard
  const { userId } = getAuth(req); // Clerk auth
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { orderIdStr, seller, amount, timeout, isNFT, tokenURI, royaltyBps } = body;
  const orderId = ethers.id(orderIdStr) as `0x${string}`; // bytes32 (ethers v6)
  try {
    // Prep calldata for frontend
    const calldata = await publicClient.prepareTransactionRequest({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: 'deposit',
      args: [orderId, seller, amount, timeout, isNFT, tokenURI, royaltyBps],
    });
    return NextResponse.json({ calldata });  // Frontend signs
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Deposit prep failed' }, { status: 500 });
  }
}
