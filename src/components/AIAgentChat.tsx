// /components/AIAgentChat.tsx
import { AgentChat } from '@coinbase/agent-kit/react';
import { releaseEscrow } from '@/agent/actions/releaseEscrow';
// Add more actions as needed (e.g., dispute, listProduct)

export function AIAgentChat() {
  return <AgentChat actions={[releaseEscrow]} />; // Renders chat UI
}
