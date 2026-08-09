import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toPersianMessage } from '../lib/errors';
import { buildClipboardScript } from '../lib/lua';
import { MarkdownText } from '../components/common/MarkdownText';
import { Script, ReactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { ReportModal } from '../components/scripts/ReportModal';
import {
  Eye,
  Heart,
  ThumbsDown,
  Bookmark,
  Share2,
  Flag,
  Copy,
  Check,
  CheckCircle2,
  Key,
  KeyRound,
  Calendar,
  Gamepad2,
  User,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Pencil,
  Terminal,
  Layers,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ScriptDetailPage: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // User interactions state
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [userFavorite, setUserFavorite] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);

  const isAdminOrMod = profile?.role === 'admin' || profile?.role === 'moderator';

  // Fetch Script Data
  const fetchScriptDetail = useCallback(async () => {
    if (!slugOrId) return;
    setLoading(true);
    try {
      // First try slug, then fallback to id
      let query = supabase
        .from('scripts')
        .select(`*, profiles:author_id (display_name, username, avatar_url, role)`);

      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slugOrId);
      if (isUuid) {
        query = query.eq('id', slugOrId);
      } else {
        query = query.eq('slug', slugOrId);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        toast.error('اسکریپت مورد نظر یافت نشد.');
        setLoading(false);
        return;
      }

      const parsed: Script = {
        ...data,
        author_display_name: data.profiles?.display_name,
        author_username: data.profiles?.username,
        author_avatar_url: data.profiles?.avatar_url,
        author_role: data.profiles?.role,
      };

      setScript(parsed);
      setLikeCount(parsed.like_count || 0);
      setDislikeCount(parsed.dislike_count || 0);
      setFavoriteCount(parsed.favorite_count || 0);

      // Securely record unique view in database
      const viewerHash = 'ip_' + (user?.id || 'guest') + '_' + new Date().toDateString();
      await supabase.rpc('register_script_view', {
        p_script_id: parsed.id,
        p_viewer_ip_hash: viewerHash,
        p_user_id: user?.id || null,
      });

      // Fetch user specific reaction and favorite if authenticated
      if (user) {
        const [{ data: reactionData }, { data: favData }] = await Promise.all([
          supabase
            .from('script_reactions')
            .select('reaction_type')
            .eq('script_id', parsed.id)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('script_favorites')
            .select('id')
            .eq('script_id', parsed.id)
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (reactionData) {
          setUserReaction(reactionData.reaction_type as ReactionType);
        } else {
          setUserReaction(null);
        }
        setUserFavorite(!!favData);
      }
    } catch (err: any) {
      console.error('Error fetching script detail:', err);
    } finally {
      setLoading(false);
    }
  }, [slugOrId, user]);

  useEffect(() => {
    fetchScriptDetail();
  }, [fetchScriptDetail]);

  // Clipboard helper — clipboard APIs can reject on some browsers/permissions
  const writeToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Native Android bridge first (works on file:// pages, shows a toast)
      const bridge = (window as any).AndroidBridge;
      if (bridge && typeof bridge.copyToClipboard === 'function') {
        bridge.copyToClipboard(text);
        return true;
      }
    } catch (e) {
      // fall through to browser API
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        // Legacy fallback for very old browsers
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Handle Copy to Clipboard — unverified scripts get a harmless visual warning
  // comment on the first line (a `--` Lua comment, so the run is never affected).
  const handleCopyCode = async () => {
    if (!script) return;
    const isUntested = !script.is_verified;
    const ok = await writeToClipboard(
      buildClipboardScript(script.script_content, !!script.is_verified)
    );
    if (!ok) {
      toast.error('کپی در مرورگر شما ممکن نشد؛ کد را به‌صورت دستی انتخاب و کپی کنید.');
      return;
    }
    setCopied(true);
    toast.success(
      isUntested
        ? 'کد اسکریپت کپی شد!\nخط اول فقط یک هشدار دیداری است (کامنت Lua) و تأثیری روی اجرای اسکریپت ندارد.'
        : 'کد اسکریپت در حافظه کپی شد!'
    );
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle Share Link
  const handleShare = async () => {
    const ok = await writeToClipboard(window.location.href);
    if (ok) {
      toast.success('لینک اسکریپت کپی شد! اکنون می‌توانید با دوستانتان به اشتراک بگذارید.');
    } else {
      toast.error('کپی لینک ممکن نشد؛ آدرس صفحه را از نوار مرورگر کپی کنید.');
    }
  };

  // Handle Like/Dislike reaction logic: one reaction per user, toggle removes, opposite switches
  const handleReaction = async (targetType: ReactionType) => {
    if (!user || !script) {
      toast.error('برای ثبت واکنش ابتدا وارد حساب کاربری خود شوید');
      onOpenAuthModal();
      return;
    }

    try {
      if (userReaction === targetType) {
        // Remove reaction
        await supabase
          .from('script_reactions')
          .delete()
          .eq('script_id', script.id)
          .eq('user_id', user.id);

        setUserReaction(null);
        if (targetType === 'like') setLikeCount((prev) => Math.max(0, prev - 1));
        if (targetType === 'dislike') setDislikeCount((prev) => Math.max(0, prev - 1));
      } else if (userReaction === null) {
        // Insert new reaction
        await supabase.from('script_reactions').insert({
          script_id: script.id,
          user_id: user.id,
          reaction_type: targetType,
        });

        setUserReaction(targetType);
        if (targetType === 'like') setLikeCount((prev) => prev + 1);
        if (targetType === 'dislike') setDislikeCount((prev) => prev + 1);
      } else {
        // Switch reaction
        await supabase
          .from('script_reactions')
          .update({ reaction_type: targetType })
          .eq('script_id', script.id)
          .eq('user_id', user.id);

        setUserReaction(targetType);
        if (targetType === 'like') {
          setLikeCount((prev) => prev + 1);
          setDislikeCount((prev) => Math.max(0, prev - 1));
        } else {
          setDislikeCount((prev) => prev + 1);
          setLikeCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در ثبت واکنش.'));
    }
  };

  // Handle Favorite toggle
  const handleToggleFavorite = async () => {
    if (!user || !script) {
      toast.error('برای ذخیره در علاقه‌مندی‌ها ابتدا وارد حساب کاربری شوید');
      onOpenAuthModal();
      return;
    }

    try {
      if (userFavorite) {
        await supabase
          .from('script_favorites')
          .delete()
          .eq('script_id', script.id)
          .eq('user_id', user.id);

        setUserFavorite(false);
        setFavoriteCount((prev) => Math.max(0, prev - 1));
        toast.success('از لیست علاقه‌مندی‌ها حذف شد.');
      } else {
        await supabase.from('script_favorites').insert({
          script_id: script.id,
          user_id: user.id,
        });

        setUserFavorite(true);
        setFavoriteCount((prev) => prev + 1);
        toast.success('به لیست علاقه‌مندی‌ها اضافه شد!');
      }
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در ذخیره علاقه‌مندی.'));
    }
  };

  // Admin/Moderator Action: Toggle verify mark of approval
  const handleAdminVerifyToggle = async () => {
    if (!script) return;
    try {
      const nextVerify = !script.is_verified;
      const { error } = await supabase
        .from('scripts')
        .update({ is_verified: nextVerify })
        .eq('id', script.id);

      if (error) throw error;
      setScript((prev) => (prev ? { ...prev, is_verified: nextVerify } : prev));
      toast.success(
        nextVerify ? 'نشان تأیید مدیریت (Approval Mark) اعطا شد.' : 'نشان تأیید حذف شد.'
      );
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در اعمال تغییرات مدیریت.'));
    }
  };

  // Admin/Moderator Action: Toggle patched status
  const handleAdminPatchToggle = async () => {
    if (!script) return;
    try {
      const nextPatched = !script.is_patched;
      const { error } = await supabase
        .from('scripts')
        .update({ is_patched: nextPatched })
        .eq('id', script.id);

      if (error) throw error;
      setScript((prev) => (prev ? { ...prev, is_patched: nextPatched } : prev));
      toast.success(nextPatched ? 'وضعیت به پچ‌شده تغییر کرد.' : 'وضعیت پچ برداشته شد.');
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در اعمال تغییرات.'));
    }
  };

  // Admin/Author Action: Delete Script
  const handleDeleteScript = async () => {
    if (!script) return;
    const confirmed = window.confirm('آیا از حذف دائمی این اسکریپت مطمئن هستید؟');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('scripts').delete().eq('id', script.id);
      if (error) throw error;
      toast.success('اسکریپت با موفقیت حذف شد.');
      navigate('/');
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در حذف اسکریپت.'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
        <div className="w-full aspect-video max-h-96 bg-dark-800 rounded-3xl mb-8" />
        <div className="h-8 bg-dark-800 rounded w-1/3 mb-4" />
        <div className="h-32 bg-dark-800 rounded w-full" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">اسکریپت مورد نظر یافت نشد</h2>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-electric-500 text-dark-900 font-bold"
        >
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>
    );
  }

  const isAuthor = user?.id === script.author_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به لیست اسکریپت‌ها</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column (2 spans): Title, Thumbnail, Script Code Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail */}
          <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-electric-500/20 aspect-video shadow-glow-sm">
            {script.thumbnail_url ? (
              <img
                src={script.thumbnail_url}
                alt={script.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-electric-500/15 flex items-center justify-center p-6">
                <div className="text-center">
                  <Gamepad2 className="w-16 h-16 text-electric-400 mx-auto mb-3 opacity-80" />
                  <p className="text-sm text-slate-400 font-mono tracking-wider">ROBLOX SCRIPT PLATFORM</p>
                </div>
              </div>
            )}

            {/* Top badges over thumbnail */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {script.is_verified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/85 backdrop-blur-md text-electric-400 border border-electric-500/50 text-xs font-bold shadow-glow-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأیید شده</span>
                </span>
              )}

              {script.is_patched && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/85 backdrop-blur-md text-white border border-rose-400/50 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>پچ شده</span>
                </span>
              )}
            </div>

            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-900/85 backdrop-blur-md text-slate-200 border border-white/15 text-xs font-mono">
                <Eye className="w-4 h-4 text-electric-400" />
                <span>{script.view_count.toLocaleString('fa-IR')} بازدید</span>
              </span>
            </div>
          </div>

          {/* Title & Game Badge */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs px-3 py-1 rounded-full bg-electric-500/15 text-electric-400 border border-electric-500/30 font-bold">
                {script.is_hub_or_universal ? 'هاب / عمومی (Universal Hub)' : script.game_name}
              </span>

              {script.game_id && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-dark-800 text-slate-400 border border-white/10 font-mono">
                  ID: {script.game_id}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl font-black text-white leading-snug break-words">
              {script.title}
            </h1>
          </div>

          {/* Action Bar Required by Spec: Like, Dislike, Favorite, Share, Report */}
          <div className="glass-card rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              {/* Like */}
              <button
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  userReaction === 'like'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'bg-dark-900/70 border-white/10 text-slate-300 hover:border-rose-500/40 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${userReaction === 'like' ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{likeCount}</span>
              </button>

              {/* Dislike */}
              <button
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  userReaction === 'dislike'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-dark-900/70 border-white/10 text-slate-300 hover:border-amber-500/40 hover:text-amber-400'
                }`}
              >
                <ThumbsDown className={`w-4 h-4 ${userReaction === 'dislike' ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{dislikeCount}</span>
              </button>

              {/* Favorite / Bookmark */}
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  userFavorite
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-dark-900/70 border-white/10 text-slate-300 hover:border-amber-400/40 hover:text-amber-300'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${userFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                <span>{favoriteCount} ذخیره</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Share */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-dark-900/70 border border-white/10 hover:border-electric-500/40 text-slate-300 hover:text-white text-[11px] sm:text-xs font-bold transition-all"
                title="اشتراک‌گذاری لینک"
              >
                <Share2 className="w-4 h-4 text-electric-400" />
                <span className="hidden min-[400px]:inline">اشتراک‌گذاری</span>
              </button>

              {/* Report */}
              <button
                onClick={() => {
                  if (!user) {
                    toast.error('برای گزارش تخلف ابتدا وارد حساب شوید.');
                    onOpenAuthModal();
                    return;
                  }
                  setIsReportOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-dark-900/70 border border-white/10 hover:border-rose-500/40 text-slate-300 hover:text-rose-400 text-[11px] sm:text-xs font-bold transition-all"
                title="گزارش تخلف"
              >
                <Flag className="w-4 h-4 text-rose-500" />
                <span className="hidden min-[400px]:inline">گزارش تخلف</span>
              </button>
            </div>
          </div>

          {/* Script Code Editor Block Required by Spec */}
          <div className="rounded-2xl bg-dark-950 border border-electric-500/30 overflow-hidden shadow-glow-sm">
            {/* Header / Copy Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-white/10">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <Terminal className="w-4 h-4 text-electric-400" />
                <span>کد سورس اسکریپت (LUA)</span>
              </div>

              <button
                onClick={handleCopyCode}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  copied
                    ? 'bg-emerald-500 text-dark-900 shadow-glow-sm'
                    : 'bg-electric-500/20 hover:bg-electric-500/30 text-electric-400 border border-electric-500/40'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>کپی کردن اسکریپت</span>
                  </>
                )}
              </button>
            </div>

            {/* Readable code block */}
            <div className="p-4 sm:p-6 overflow-x-auto">
              <pre className="text-xs sm:text-sm font-mono text-electric-300 leading-relaxed dir-ltr text-left whitespace-pre-wrap selection:bg-electric-500 selection:text-dark-950">
                <code>{script.script_content}</code>
              </pre>
            </div>
          </div>

          {/* Commit Message */}
          {script.commit_message && (
            <div className="p-4 rounded-2xl bg-dark-800/70 border border-white/10 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-electric-500/10 text-electric-400 shrink-0">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-400 mb-0.5">یادداشت ثبت تغییرات نسخه (Commit Message):</div>
                <div className="text-sm font-medium text-white">{script.commit_message}</div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column (1 span): Metadata, Author Info, Features, Supported games */}
        <div className="space-y-6">
          {/* Author Card */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">
              نویسنده اسکریپت
            </h3>
            <Link
              to={`/author/${script.author_id}`}
              className="flex items-center gap-3.5 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-dark-700 flex items-center justify-center font-black text-white text-base shrink-0 border border-electric-500/30 group-hover:border-electric-500 transition-colors">
                {script.author_avatar_url ? (
                  <img
                    src={script.author_avatar_url}
                    alt={script.author_display_name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  script.author_display_name?.[0] || 'U'
                )}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-base text-white group-hover:text-electric-400 transition-colors truncate flex items-center gap-1.5">
                  <span className="truncate">{script.author_display_name || 'کاربر روبلاکس'}</span>
                  {script.author_role === 'admin' && (
                    <span title="مدیر سایت" className="text-sm shrink-0 select-none">
                      👑
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-400 truncate">
                  @{script.author_username || 'user'}
                </div>
              </div>
            </Link>
          </div>

          {/* Metadata Checklist Required by Spec */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              مشخصات اسکریپت
            </h3>

            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-400">نیاز به کلید:</span>
              <span>
                {script.key_requirement === 'keyless' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                    بدون کلید
                  </span>
                ) : script.key_requirement === 'key_required' ? (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <Key className="w-3.5 h-3.5" />
                    نیازمند کلید
                  </span>
                ) : (
                  <span className="text-slate-400">نامشخص</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-400">تاریخ ساخت:</span>
              <span className="font-mono text-slate-200">
                {new Date(script.created_at).toLocaleDateString('fa-IR')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-400">آخرین به‌روزرسانی:</span>
              <span className="font-mono text-slate-200">
                {new Date(script.updated_at).toLocaleDateString('fa-IR')}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-white/5">
              <span className="text-slate-400">وضعیت پچ:</span>
              <span>
                {script.is_patched ? (
                  <span className="text-rose-400 font-bold">پچ شده (غیرفعال)</span>
                ) : (
                  <span className="text-emerald-400 font-bold">فعال و سالم</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-slate-400">سطح دسترسی:</span>
              <span className="font-bold text-electric-400">
                {script.visibility === 'public'
                  ? 'عمومی'
                  : script.visibility === 'unlisted'
                  ? 'فقط با لینک'
                  : 'خصوصی'}
              </span>
            </div>
          </div>

          {/* Features description */}
          {script.features && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-xs font-bold text-electric-400 mb-3 uppercase tracking-wider">
                ویژگی‌ها و امکانات
              </h3>
              <MarkdownText
                text={script.features}
                className="text-xs sm:text-sm text-slate-200 leading-relaxed"
              />
            </div>
          )}

          {/* Supported Games */}
          {script.supported_games && script.supported_games.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                بازی‌های پشتیبانی‌شده
              </h3>
              <div className="flex flex-wrap gap-2">
                {script.supported_games.map((g, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-lg bg-dark-900 border border-white/10 text-xs font-medium text-slate-200"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {script.tags && script.tags.length > 0 && (
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                تگ‌ها
              </h3>
              <div className="flex flex-wrap gap-2">
                {script.tags.map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin / Moderator / Author Management Toolbar */}
          {(isAdminOrMod || isAuthor) && (
            <div className="p-5 rounded-2xl bg-dark-800/90 border border-amber-500/30 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>پنل مدیریت و وضعیت اسکریپت</span>
              </h3>

              <div className="flex flex-col gap-2">
                {isAdminOrMod && (
                  <>
                    <button
                      onClick={handleAdminVerifyToggle}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        script.is_verified
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {script.is_verified ? 'حذف نشان تأیید مدیریت (Verify)' : 'اعطای نشان تأیید مدیریت'}
                    </button>

                    <button
                      onClick={handleAdminPatchToggle}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        script.is_patched
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30'
                      }`}
                    >
                      {script.is_patched ? 'تغییر وضعیت به: سالم و کارآمد' : 'تغییر وضعیت به: پچ‌شده (Patched)'}
                    </button>
                  </>
                )}

                {isAuthor && (
                  <button
                    onClick={() => navigate(`/edit/${script.id}`)}
                    className="w-full py-2 px-3 rounded-xl bg-dark-900 border border-electric-500/40 text-electric-300 hover:bg-electric-500/15 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>ویرایش اسکریپت</span>
                  </button>
                )}

                {(isAuthor || isAdminOrMod) && (
                  <button
                    onClick={handleDeleteScript}
                    className="w-full py-2 px-3 rounded-xl bg-dark-900 border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف دائمی اسکریپت</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scriptId={script.id}
        scriptTitle={script.title}
      />
    </div>
  );
};
