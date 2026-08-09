import React from 'react';
import { Link } from 'react-router-dom';
import { Script } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { toPersianMessage } from '../../lib/errors';
import {
  Eye,
  Heart,
  Bookmark,
  Key,
  KeyRound,
  ShieldCheck,
  Calendar,
  Gamepad2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ScriptCardProps {
  script: Script;
  onRefresh?: () => void;
}

// Relative time formatting in Persian
const formatPersianRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < 60) return 'همین حالا';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} دقیقه پیش`;
  const diffInHour = Math.floor(diffInMin / 60);
  if (diffInHour < 24) return `${diffInHour} ساعت پیش`;
  const diffInDay = Math.floor(diffInHour / 24);
  if (diffInDay < 30) return `${diffInDay} روز پیش`;
  const diffInMonth = Math.floor(diffInDay / 30);
  if (diffInMonth < 12) return `${diffInMonth} ماه پیش`;
  return `${Math.floor(diffInMonth / 12)} سال پیش`;
};

export const ScriptCard: React.FC<ScriptCardProps> = ({ script, onRefresh }) => {
  const { profile } = useAuth();
  const isAdminOrMod = profile?.role === 'admin' || profile?.role === 'moderator';
  // Scripts uploaded by ADMIN accounts: golden outline + always pinned to top (see HomePage)
  const isAdminScript = script.author_role === 'admin';

  const handleToggleVerify = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const nextVerify = !script.is_verified;
      const { error } = await supabase
        .from('scripts')
        .update({ is_verified: nextVerify })
        .eq('id', script.id);

      if (error) throw error;
      toast.success(
        nextVerify
          ? 'نشان تأیید مدیریت (Mark of Approval) به اسکریپت داده شد'
          : 'نشان تأیید برداشته شد'
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در تغییر وضعیت تأیید.'));
    }
  };

  return (
    <Link
      to={`/script/${script.slug || script.id}`}
      className={`group relative flex flex-col rounded-2xl bg-dark-800/90 overflow-hidden transition-all duration-300 ${
        isAdminScript
          ? 'border-2 border-amber-400/80 hover:border-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.22)] hover:shadow-[0_0_30px_rgba(251,191,36,0.35)]'
          : 'border border-electric-500/20 hover:border-electric-500/60 shadow-sm hover:shadow-glow-sm'
      }`}
    >
      {/* 16:9 Thumbnail Container — compact badges on mobile so the small
          cards never look crowded */}
      <div className="relative w-full aspect-video bg-dark-900 overflow-hidden">
        {script.thumbnail_url ? (
          <img
            src={script.thumbnail_url}
            alt={script.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          /* Sleek Roblox Script fallback thumbnail gradient */
          <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-electric-500/15 flex items-center justify-center p-2 sm:p-4">
            <div className="text-center">
              <div className="inline-flex p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-dark-700/50 border border-electric-500/30 mb-1 sm:mb-2">
                <Gamepad2 className="w-5 h-5 sm:w-8 sm:h-8 text-electric-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="hidden sm:block text-xs text-slate-400 font-mono tracking-wider">ROBLOX SCRIPT</p>
            </div>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-dark-900/40" />

        {/* Top-Left: View Count */}
        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-dark-900/80 backdrop-blur-md border border-white/10 text-[10px] sm:text-xs font-mono text-slate-200">
          <Eye className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-electric-400" />
          <span>{(script.view_count || 0).toLocaleString('fa-IR')}</span>
        </div>

        {/* Top-Right: Relative publish/update time (hidden on tiny mobile cards) */}
        <div className="absolute top-3 right-3 hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-900/80 backdrop-blur-md border border-white/10 text-[11px] text-slate-300">
          <Calendar className="w-3 h-3 text-slate-400" />
          <span>{formatPersianRelativeTime(script.updated_at || script.created_at)}</span>
        </div>

        {/* Bottom-Left: Key status (icon-only on mobile) */}
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-3 sm:left-3">
          {script.key_requirement === 'keyless' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs font-bold">
              <KeyRound className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">بدون کلید</span>
            </span>
          ) : script.key_requirement === 'key_required' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] sm:text-xs font-bold">
              <Key className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="hidden sm:inline">نیازمند کلید</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-700/80 text-slate-400 border border-white/10 text-xs font-medium">
              نامشخص
            </span>
          )}
        </div>

        {/* Verified Status Mark of Approval Badge (icon-only on mobile) */}
        {script.is_verified && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-3 sm:right-3">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-gradient-to-r from-electric-500/25 to-cyan-500/25 text-electric-400 border border-electric-500/50 text-[10px] sm:text-xs font-bold shadow-glow-sm">
              <CheckCircle2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-electric-400" />
              <span className="hidden sm:inline">تأیید شده</span>
            </span>
          </div>
        )}
      </div>

      {/* Card Content — tighter padding & type on mobile */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between gap-2 sm:gap-3">
        <div>
          {/* Game badge */}
          <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-electric-400 truncate max-w-[70%]">
              {script.is_hub_or_universal ? 'هاب / عمومی' : script.game_name || 'روبلاکس'}
            </span>
            {script.is_patched && (
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold shrink-0">
                پچ شده
              </span>
            )}
          </div>

          {/* Script Title */}
          <h3 className="font-bold text-xs sm:text-base text-white group-hover:text-electric-400 transition-colors line-clamp-2 leading-snug">
            {script.title}
          </h3>
        </div>

        {/* Footer info: author, likes, favorites */}
        <div className="pt-2 sm:pt-3 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-xs text-slate-400">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-dark-700 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs shrink-0 border border-white/15">
              {script.author_display_name?.[0] || 'U'}
            </div>
            <span className="truncate flex items-center gap-1">
              <span className="truncate">{script.author_display_name || 'کاربر روبلاکس'}</span>
              {isAdminScript && (
                <span title="مدیر سایت" className="text-[11px] shrink-0 select-none">
                  👑
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-0.5 sm:gap-1 text-slate-300">
              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              <span>{script.like_count || 0}</span>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 text-slate-300">
              <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span>{script.favorite_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Admin/Moderator Quick Verify Button */}
        {isAdminOrMod && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-2 border-t border-white/5 flex items-center justify-end"
          >
            <button
              onClick={handleToggleVerify}
              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[11px] font-bold transition-all ${
                script.is_verified
                  ? 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>{script.is_verified ? 'حذف نشان تأیید' : 'اعطای نشان تأیید'}</span>
            </button>
          </div>
        )}
      </div>
    </Link>
  );
};
