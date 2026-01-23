// src/components/AIStatusChat.tsx
'use client';
import { AgentChat } from '@coinbase/agent-kit/react';
import { releaseEscrow, disputeEscrow } from '@/agent/actions'; // From specs; add dispute similar

export default function AIStatusChat({ orderId }: { orderId: string }) {
  // Custom actions gated by HLE/user role
  const actions = [releaseEscrow, disputeEscrow]; // Wrapped with guards

  return <AgentChat actions={actions} initialContext={{ orderId }} />; // Chat UI
}
