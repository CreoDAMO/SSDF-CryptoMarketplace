'use client';
import { useState, FormEvent, ReactNode } from 'react';

interface Action {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

interface AgentChatProps {
  actions: Action[];
  initialContext?: Record<string, any>;
}

export function AgentChat({ actions, initialContext }: AgentChatProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Simple action matching
      const matchedAction = actions.find(a => 
        userMessage.toLowerCase().includes(a.name.replace('_', ' '))
      );

      if (matchedAction) {
        const result = await matchedAction.execute({ ...initialContext });
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Executed ${matchedAction.name}: ${JSON.stringify(result)}`
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I can help you with: ${actions.map(a => a.description).join(', ')}`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-chat p-4 border rounded">
      <div className="messages space-y-2 mb-4 max-h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your order..."
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded">
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
