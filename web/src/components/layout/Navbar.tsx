import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOnlineCounts, sendHeartbeat } from '../../lib/supabase';
import { Upload, User, Shield, Home, LogOut, Menu } from 'lucide-react';
import { SideMenu } from './SideMenu';

interface NavbarProps {
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuthModal }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [onlineStats, setOnlineStats] = useState({ registeredUsers: 0, guestUsers: 1 });
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  useEffect(() => {
    // Initial heartbeat and stats fetch
    const updatePresence = async () => {
      await sendHeartbeat(user?.id);
      const counts = await getOnlineCounts();
      setOnlineStats(counts);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // refresh every 30 seconds
    // Background tabs throttle/pause setInterval — re-ping immediately when the
    // user returns so they (and the counters) stay accurate
    const onVisibility = () => {
      if (document.visibilityState === 'visible') updatePresence();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);

  const isActiveRoute = (path: string) => location.pathname === path;
  const totalOnline = onlineStats.registeredUsers + onlineStats.guestUsers;

  return (
    <header className="sticky top-0 z-40 w-full bg-dark-900/85 backdrop-blur-md border-b border-electric-500/15 transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Hamburger (3-line) button — opens the sections side menu (closed by default) */}
          <button
            onClick={() => setIsSideMenuOpen(true)}
            title="منوی بخش‌های سایت"
            aria-label="منوی بخش‌های سایت"
            className="p-2 rounded-xl bg-dark-800/80 border border-white/10 hover:border-electric-500/50 text-slate-300 hover:text-electric-400 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Header Branding & Real-time Counters Area — min-w-0 + overflow-hidden
              so a crowded row can never let the buttons spill OVER the brand text */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
            <Link to="/" className="group flex items-center gap-2 min-w-0">
              <span className="text-lg sm:text-2xl font-black tracking-tight text-white group-hover:text-electric-500 transition-colors whitespace-nowrap truncate">
                Roblox Script
              </span>
            </Link>

            {/* Desktop/tablet: compact counters for users & guests */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1 bg-dark-800/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{onlineStats.registeredUsers} کاربران آنلاین</span>
              </div>
              <div className="hidden md:flex items-center gap-1 bg-dark-800/80 px-2 py-0.5 rounded-full border border-electric-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-electric-500 animate-pulse" />
                <span>{onlineStats.guestUsers} میهمانان آنلاین</span>
              </div>
            </div>
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Home — desktop/tablet only. On mobile the brand text itself is
                the home link (and the results page has its own home button),
                so the crowded phone header stays clean and can never overlap. */}
            <Link
              to="/"
              className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActiveRoute('/')
                  ? 'bg-electric-500/15 text-electric-500 border border-electric-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-dark-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>صفحه اصلی</span>
            </Link>

            {/* Upload: icon-only on mobile, icon + text on larger screens */}
            <Link
              to="/upload"
              title="آپلود اسکریپت"
              aria-label="آپلود اسکریپت"
              className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">آپلود اسکریپت</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Account button — symbol only (no name/username in the header,
                    so long names can never push/break the buttons). Tap = dashboard,
                    hover/long-press shows the name via the title. */}
                <Link
                  to="/dashboard"
                  title={profile?.display_name || user.email || 'داشبورد'}
                  aria-label="حساب کاربری (داشبورد)"
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    isActiveRoute('/dashboard')
                      ? 'bg-electric-500/20 border-electric-500 text-white'
                      : 'bg-dark-800/70 border-white/10 text-slate-300 hover:text-white hover:border-electric-500/40'
                  }`}
                >
                  <User className="w-4 h-4 text-electric-500 shrink-0" />
                  {profile?.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 px-1 sm:px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Shield className="w-3 h-3" />
                      <span className="hidden sm:inline">مدیر</span>
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => signOut()}
                  title="خروج از حساب"
                  aria-label="خروج از حساب"
                  className="p-2 rounded-xl bg-dark-800/60 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Sign in — same account symbol as signed-in users (no text on
                 tiny screens, icon + label on larger ones) */
              <button
                onClick={onOpenAuthModal}
                title="ورود / عضویت"
                aria-label="ورود / عضویت"
                className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-xl bg-dark-800 border border-electric-500/30 hover:border-electric-500 text-electric-400 hover:text-electric-300 font-medium text-sm transition-all shadow-sm"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">ورود / عضویت</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile online counter — its own slim row under the nav so it is always
          fully visible and can never collide with the upload/login buttons */}
      <div className="sm:hidden border-t border-white/5 bg-dark-900/60">
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 text-[10px] font-mono text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">
            {totalOnline.toLocaleString('fa-IR')} نفر آنلاین
          </span>
          <span className="text-slate-500 whitespace-nowrap">
            ({onlineStats.registeredUsers.toLocaleString('fa-IR')} کاربر •{' '}
            {onlineStats.guestUsers.toLocaleString('fa-IR')} میهمان)
          </span>
        </div>
      </div>

      {/* Sections side menu (Scripts / Exploits) */}
      <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
    </header>
  );
};
