import { getAuth } from '@clerk/nextjs/server';
import { Dispute, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';
import { publicClient } from '@/lib/viem';
import { escrowAbi, ESCROW_ADDRESS } from '@/abis/EscrowABI';

const AI_PROMPT = `You are an advisory AI analyst for a non-custodial crypto marketplace escrow system. Your role is to provide impartial, fact-based recommendations on disputes, but you have no authority to resolve them—admins make final calls based on onchain evidence. Stick strictly to provided details; do not hallucinate, assume, or invent facts, outcomes, or evidence. If evidence is missing, conflicting, or insufficient, output "INSUFFICIENT EVIDENCE" as recommendation and set confidence to 0. Use chain-of-thought reasoning: break down step-by-step before concluding. Verify consistency across inputs—flag any contradictions without resolving them.

Dispute Details (use only this—do not add external knowledge):
- Order ID: {orderId}
- Buyer Claim: {buyerClaim} (if empty, note 'No claim provided—insufficient for analysis')
- Seller Response: {sellerResponse} (if empty, note 'No response—factor into uncertainty; do not assume seller fault')
- Escrow Amount: {amount} USDC
- Timeout: {timeout} (Unix timestamp—check if expired)
- Product Type: {productType}

Analyze step-by-step (chain-of-thought—do not skip):
1. Summarize provided facts only: List buyer claim, seller response, and any verifiable gaps.
2. Check consistency: Are claim and response aligned? Flag contradictions.
3. Evaluate against escrow rules: Atomic release on confirmation, no platform custody.
4. Self-check: If evidence is low, lower confidence and recommend "INSUFFICIENT EVIDENCE".
5. Recommend only if evidence sufficient: 'REFUND' (to buyer) or 'RELEASE' (to seller). Confidence (0-100%).

Output JSON only (no extra text):
{
  "recommendation": "REFUND" | "RELEASE" | "INSUFFICIENT EVIDENCE",
  "confidence": number (0-100),
  "reasoning": ["step 1 summary", "step 2 consistency", "step 3 rules check", "step 4 self-check", "step 5 conclusion"],
  "model": "your-model-name",
  "notes": "Advisory only—admin must independently verify onchain."
}`;

export async function POST(req: NextRequest) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

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

    const amount = escrowData ? (Number(escrowData[2]) / 1e6).toFixed(2) : 'Unknown';
    const timeout = escrowData ? new Date(Number(escrowData[3]) * 1000).toISOString() : 'Unknown';
    const isNFT = escrowData ? escrowData[5] : false;

    const prompt = AI_PROMPT
      .replace('{orderId}', orderId)
      .replace('{buyerClaim}', dispute.buyerClaim || '')
      .replace('{sellerResponse}', dispute.sellerResponse || '')
      .replace('{amount}', amount)
      .replace('{timeout}', timeout)
      .replace('{productType}', isNFT ? 'NFT-backed' : 'Standard digital');

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      const mockAnalysis = {
        recommendation: 'INSUFFICIENT EVIDENCE',
        confidence: 0,
        reasoning: [
          'Step 1: Buyer claim present, no seller response yet',
          'Step 2: Cannot verify consistency without seller input',
          'Step 3: Escrow rules apply but need both perspectives',
          'Step 4: Low evidence - insufficient for recommendation',
          'Step 5: Recommend waiting for seller response'
        ],
        model: 'mock-v1',
        notes: 'Advisory only—admin must independently verify onchain. AI service not configured.'
      };

      dispute.aiAnalysis = {
        ...mockAnalysis,
        createdAt: new Date()
      };
      dispute.status = 'AI_REVIEWED';
      await dispute.save();

      return NextResponse.json({ success: true, analysis: mockAnalysis });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON in response');
      }
    } catch (e) {
      analysis = {
        recommendation: 'INSUFFICIENT EVIDENCE',
        confidence: 0,
        reasoning: ['Failed to parse AI response'],
        model: 'gpt-4o-mini',
        notes: 'Parse error - manual review required'
      };
    }

    dispute.aiAnalysis = {
      ...analysis,
      createdAt: new Date()
    };
    dispute.status = 'AI_REVIEWED';
    await dispute.save();

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error('AI resolution error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
