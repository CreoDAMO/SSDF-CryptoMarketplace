'use client';
import { AgentChat } from '@/lib/agent-kit/react';

const releaseEscrow = {
  name: 'release_escrow',
  description: 'Release funds from escrow after confirmation',
  execute: async (params: any) => {
    const res = await fetch('/api/escrow/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
};

const disputeEscrow = {
  name: 'dispute_escrow',
  description: 'Flag dispute for an order',
  execute: async (params: any) => {
    const res = await fetch('/api/escrow/dispute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
};

export default function AIStatusChat({ orderId }: { orderId: string }) {
  const actions = [releaseEscrow, disputeEscrow];
  return <AgentChat actions={actions} initialContext={{ orderId }} />;
}
