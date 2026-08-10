import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { Portal } from '../common/Portal';
import { MarkdownText } from '../common/MarkdownText';
import { sendChatMessage } from '../../lib/chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const nowTime = () =>
  new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  time: nowTime(),
  content:
    'سلام! 👋 من **همیار**، دستیار هوشمند Roblox Script هستم 🤖\nبه **همه اطلاعات سایت** دسترسی دارم:\n• 📜 همه اسکریپت‌ها (۸۰ تای محبوب + جستجو)\n• 💉 وضعیت اکسپلویت‌ها و درصد UNC/sUNC\n• 👥 ناشران و آپلودکنندگان اسکریپت‌ها\n• 🎮 نسخه‌های فعلی روبلاکس\n\nفقط متن جواب می‌دم (قابلیت ساخت عکس ندارم).\nبگو دنبال اسکریپت کدوم بازی یا کدوم اکسپلویتی؟',
};

// Floating AI assistant: round FAB at the bottom corner (fixed — does not move
// with scrolling) that opens a messenger-style chat charged with the site's data.
export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed the welcome bubble the first time the chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ ...WELCOME_MESSAGE, time: nowTime() }]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text, time: nowTime() };
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = [...messages, userMsg]
        .slice(-12)
        .map(({ role, content }) => ({ role, content }));
      const reply = await sendChatMessage(history);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, time: nowTime() }]);
    } catch (err: any) {
      const fallback =
        err?.message === 'RATE_LIMITED'
          ? 'پیام‌هات پشت سر هم زیاد شد 😅 چند لحظه صبر کن و دوباره بپرس.'
          : 'متأسفم! الان اتصالم به سرور هوش مصنوعی برقرار نشد 🙏 لطفاً چند لحظه بعد دوباره تلاش کن.';
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback, time: nowTime() }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages]);

  return (
    <Portal>
      {/* Floating action button — a simple blue button in the site's main
          theme color with a robot emoji. That's it, nothing more. */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        title="دستیار هوشمند"
        aria-label="باز کردن دستیار هوشمند"
        className={`fixed bottom-4 left-4 z-50 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-500 to-electric-600 border border-electric-400/50 shadow-glow-lg hover:scale-105 active:scale-95 transition-all duration-200 outline-none ${
          isOpen ? 'ring-2 ring-electric-300' : ''
        }`}
      >
        <span className="text-[26px] leading-none select-none">🤖</span>
      </button>

      {/* Chat window */}
      <div
        role="dialog"
        aria-label="گفتگو با دستیار هوشمند"
        className={`fixed bottom-[4.75rem] left-2 sm:left-4 z-50 w-[calc(100vw-1rem)] max-w-sm h-[65vh] min-h-[360px] max-h-[540px] rounded-2xl bg-dark-900/95 backdrop-blur-xl border border-electric-500/30 shadow-glow-lg flex flex-col overflow-hidden transition-all duration-300 origin-bottom-left ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-800/80 border-b border-electric-500/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-electric-400 to-electric-600 flex items-center justify-center text-base select-none shadow-glow-sm">
              🤖
            </span>
            <div>
              <div className="text-sm font-black text-white">همیار • دستیار هوشمند</div>
              <div className="text-[10px] text-electric-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                دسترسی کامل: اسکریپت‌ها، اکسپلویت‌ها، ناشران • فقط متن (بدون عکس)
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            title="بستن"
            aria-label="بستن گفتگو"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col max-w-[85%] ${
                m.role === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'
              }`}
            >
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed break-words ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-electric-500 to-electric-600 text-dark-950 font-medium rounded-bl-md whitespace-pre-wrap'
                    : 'bg-dark-800/90 border border-electric-500/15 text-slate-100 rounded-br-md'
                }`}
              >
                {m.role === 'assistant' && (
                  <span className="inline-flex items-center gap-1 text-electric-400 font-bold text-[10px] mb-1">
                    <Bot className="w-3 h-3" />
                    دستیار هوشمند
                  </span>
                )}
                {m.role === 'assistant' ? (
                  <MarkdownText text={m.content} className="text-slate-100" />
                ) : (
                  <span className="block">{m.content}</span>
                )}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 font-mono px-1" dir="ltr">
                {m.time}
              </span>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex flex-col max-w-[85%] ml-auto items-end">
              <div className="px-4 py-3 rounded-2xl rounded-br-md bg-dark-800/90 border border-electric-500/15 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">در حال نوشتن...</span>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="p-3 bg-dark-800/70 border-t border-electric-500/20 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="پیامت را بنویس..."
              maxLength={2000}
              className="flex-1 min-w-0 bg-dark-900 border border-white/15 focus:border-electric-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              title="ارسال"
              aria-label="ارسال پیام"
              className="p-2.5 rounded-xl bg-gradient-to-br from-electric-500 to-electric-600 hover:from-electric-400 hover:to-electric-500 text-dark-900 shadow-glow-sm transition-all disabled:opacity-40 disabled:hover:from-electric-500 shrink-0"
            >
              <Send className="w-4 h-4 -scale-x-100" />
            </button>
          </div>
          <p className="text-[9px] text-slate-500 mt-2 text-center">
            دسترسی زنده به اسکریپت‌ها، اکسپلویت‌ها و آپلودکنندگان • فقط متن، بدون ساخت تصویر • پاسخ‌ها بر اساس داده‌های لحظه‌ای سایت
          </p>
        </div>
      </div>
    </Portal>
  );
};
