import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getOnlineCounts, sendHeartbeat } from '../../lib/supabase';
import { LogIn, Upload, User, Shield, Compass, LogOut } from 'lucide-react';

interface NavbarProps {
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuthModal }) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [onlineStats, setOnlineStats] = useState({ registeredUsers: 3, guestUsers: 14 });

  useEffect(() => {
    // Initial heartbeat and stats fetch
    const updatePresence = async () => {
      await sendHeartbeat(user?.id);
      const counts = await getOnlineCounts();
      setOnlineStats(counts);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full bg-dark-900/85 backdrop-blur-md border-b border-electric-500/15 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Header Branding & Real-time Counters Area */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <Link to="/" className="group flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white group-hover:text-electric-500 transition-colors">
                Roblox Script
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-500 border border-electric-500/30 font-medium">
                FA
              </span>
            </Link>

            {/* Real-time online counters required by spec */}
            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5 bg-dark-800/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>{onlineStats.registeredUsers} کاربران آنلاین</span>
              </div>
              <div className="flex items-center gap-1.5 bg-dark-800/80 px-2.5 py-1 rounded-full border border-electric-500/30">
                <span className="w-2 h-2 rounded-full bg-electric-500 animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                <span>{onlineStats.guestUsers} میهمانان آنلاین</span>
              </div>
            </div>
          </div>

          {/* Navigation & Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                isActiveRoute('/')
                  ? 'bg-electric-500/15 text-electric-500 border border-electric-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-dark-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>کشف اسکریپت‌ها</span>
            </Link>

            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>آپلود اسکریپت</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                    isActiveRoute('/dashboard')
                      ? 'bg-electric-500/20 border-electric-500 text-white'
                      : 'bg-dark-800/70 border-white/10 text-slate-300 hover:text-white hover:border-electric-500/40'
                  }`}
                >
                  <User className="w-4 h-4 text-electric-500" />
                  <span className="max-w-[120px] truncate">
                    {profile?.display_name || user.email?.split('@')[0]}
                  </span>
                  {profile?.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <Shield className="w-3 h-3" />
                      مدیر
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => signOut()}
                  title="خروج از حساب"
                  className="p-2 rounded-xl bg-dark-800/60 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800 border border-electric-500/30 hover:border-electric-500 text-electric-400 hover:text-electric-300 font-medium text-sm transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>ورود / عضویت</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
