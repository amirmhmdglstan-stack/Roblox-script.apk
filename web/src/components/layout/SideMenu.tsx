import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, Terminal, Zap } from 'lucide-react';
import { Portal } from '../common/Portal';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Right-side drawer (RTL start side) holding the main sections of the site.
// Closed by default — opened via the hamburger (3-line) button in the navbar.
export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  // Auto-close on navigation
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close with Escape + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const isExploits = location.pathname.startsWith('/exploits');

  const items = [
    {
      to: '/',
      label: 'اسکریپت‌ها',
      desc: 'جستجو، اشتراک‌گذاری و مدیریت اسکریپت‌های روبلاکس',
      icon: <Terminal className="w-5 h-5 shrink-0" />,
      active: !isExploits,
    },
    {
      to: '/exploits',
      label: 'اکسپلویت‌ها',
      desc: 'وضعیت لحظه‌ای، سازگاری و اطلاعات کامل اکسپلویت‌ها',
      icon: <Zap className="w-5 h-5 shrink-0" />,
      active: isExploits,
    },
  ];

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-dark-950/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel (slides in from the right — the start side in RTL) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="منوی بخش‌های سایت"
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-dark-900/85 backdrop-blur-xl border-l border-electric-500/25 shadow-glow-lg transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <span className="text-base font-black text-white">بخش‌های سایت</span>
          <button
            onClick={onClose}
            title="بستن منو"
            aria-label="بستن منو"
            className="p-2 rounded-xl bg-dark-800/60 text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-2">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                item.active
                  ? 'bg-electric-500/15 border-electric-500/60 text-white shadow-glow-sm'
                  : 'bg-dark-800/50 border-white/10 text-slate-300 hover:border-electric-500/40 hover:text-white'
              }`}
            >
              <span className={`p-2 rounded-xl ${item.active ? 'bg-electric-500/20 text-electric-400' : 'bg-dark-700/70 text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-bold text-sm">
                  {item.label}
                  {item.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-electric-500 animate-pulse" />
                  )}
                </span>
                <span className="block text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {item.desc}
                </span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <p className="text-[10px] text-slate-500 text-center font-mono">
            Roblox Script — Persian Community
          </p>
        </div>
      </aside>
    </Portal>
  );
};
