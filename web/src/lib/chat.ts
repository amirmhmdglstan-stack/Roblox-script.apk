// Client helper for the AI assistant chat (server-side endpoint in server.js).

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatApiMessage[]): Promise<string> => {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (res.status === 429) throw new Error('RATE_LIMITED');
  if (!res.ok) throw new Error('AI_UNAVAILABLE');

  const data = await res.json().catch(() => null);
  if (!data?.reply) throw new Error('AI_UNAVAILABLE');
  return data.reply as string;
};
