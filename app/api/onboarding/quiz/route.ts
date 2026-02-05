import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { answer } = await req.json();

  // Explicit, stateless verification: "Can SSDF reverse a release?" -> False
  // Handle both boolean and string "false" for robustness
  const correct = answer === false || String(answer).toLowerCase() === 'false';

  if (!correct) {
    return NextResponse.json(
      { error: 'Incorrect answer' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
