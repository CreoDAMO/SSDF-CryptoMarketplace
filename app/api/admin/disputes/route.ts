import { getAuth } from '@clerk/nextjs/server';
import { Dispute, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const { userId } = getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const disputes = await Dispute.find({ 
      status: { $in: ['OPEN', 'AI_REVIEWED'] } 
    }).sort({ createdAt: 1 });

    return NextResponse.json(disputes.map(d => d.toObject()));
  } catch (err: any) {
    console.error('Admin get disputes error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
