// Client helper for the AI assistant chat.
// In the Android APK the chat endpoint is a native JS bridge
// (window.AndroidBridge.sendChatMessage); on the website it is the
// server-side endpoint in server.js (/api/ai/chat).

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (messages: ChatApiMessage[]): Promise<string> => {
  // 1) Native Android bridge (APK) — synchronous, no server needed
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.sendChatMessage === 'function') {
      const raw = bridge.sendChatMessage(JSON.stringify({ messages }));
      const data = raw ? JSON.parse(raw) : null;
      if (data?.reply) return data.reply as string;
      throw new Error('AI_UNAVAILABLE');
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'AI_UNAVAILABLE') throw e;
    // bridge exists but errored — fall through to the server endpoint
  }

  // 2) Server endpoint (website / hosted mode)
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
