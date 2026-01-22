import { NextApiRequest, NextApiResponse } from 'next';
import { indexAndReconcileEvents } from '@/lib/event-indexer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end(); // Secure: POST only
  // Optional: Verify cron secret (req.headers.authorization)
  await indexAndReconcileEvents();
  res.status(200).json({ success: true });
}
