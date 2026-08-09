// Client helper for the AI assistant chat.
// In the Android APK the chat endpoint is a native async JS bridge
// (window.AndroidBridge.sendChatMessage(json, callbackName)); on the website
// it is the server-side endpoint in server.js (/api/ai/chat).

export interface ChatApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

const BRIDGE_TIMEOUT_MS = 45000;

export const sendChatMessage = async (messages: ChatApiMessage[]): Promise<string> => {
  // 1) Native Android bridge (APK) — async callback protocol
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.sendChatMessage === 'function') {
      return await new Promise<string>((resolve, reject) => {
        const cb = '__hamyar_' + Math.random().toString(36).slice(2, 10);
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          try { delete (window as any)[cb]; } catch (e) {}
          reject(new Error('AI_UNAVAILABLE'));
        }, BRIDGE_TIMEOUT_MS);

        (window as any)[cb] = (raw: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try { delete (window as any)[cb]; } catch (e) {}
          try {
            const data = raw ? JSON.parse(raw) : null;
            if (data?.reply) resolve(data.reply);
            else reject(new Error(data?.error === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'AI_UNAVAILABLE'));
          } catch (e) {
            reject(new Error('AI_UNAVAILABLE'));
          }
        };

        try {
          bridge.sendChatMessage(JSON.stringify({ messages }), cb);
        } catch (e) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try { delete (window as any)[cb]; } catch (e2) {}
          reject(new Error('AI_UNAVAILABLE'));
        }
      });
    }
  } catch (e) {
    if (e instanceof Error && (e.message === 'AI_UNAVAILABLE' || e.message === 'RATE_LIMITED')) throw e;
    // bridge exists but failed — fall through to the server endpoint
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
