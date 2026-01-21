// /app/api/escrow/deposit/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers'; // For utils
import { publicClient, platformWalletClient } from '@/lib/viem';
import { escrowAbi } from '@/abis/EscrowABI';
import Escrow from '@/models/Escrow'; // Mongoose model
import { getAuth } from '@clerk/nextjs/server';

const ESCROW_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`;

export async function POST(req: Request) {
  const { userId } = getAuth(req); // Clerk auth
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { orderIdStr, seller, amount, timeout, isNFT, tokenURI } = body;
  const orderId = ethers.utils.id(orderIdStr) as `0x${string}`; // bytes32
  try {
    // Simulate first (viem built-in)
    await publicClient.simulateContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: 'deposit',
      args: [orderId, seller, amount, timeout, isNFT, tokenURI],
      account: platformWalletClient.account,
    });
    // Execute
    const hash = await platformWalletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: escrowAbi,
      functionName: 'deposit',
      args: [orderId, seller, amount, timeout, isNFT, tokenURI],
    });
    // Wait for confirm
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const blockNumber = receipt.blockNumber;
    // DB update
    await Escrow.create({
      orderId: orderIdStr,
      status: 'deposited',
      timeoutDate: new Date(timeout * 1000),
      onchain: { chainId: chain.id, contract: ESCROW_ADDRESS, txHash: hash, blockNumber },
    });
    return NextResponse.json({ success: true, txHash: hash });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });
  }
}
