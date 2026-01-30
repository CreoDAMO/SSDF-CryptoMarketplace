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

export function AIAgentChat() {
  return <AgentChat actions={[releaseEscrow]} />;
}
