import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Script } from '../types';
import { ScriptCard } from '../components/scripts/ScriptCard';
import {
  User,
  Upload,
  Bookmark,
  Settings,
  Trash2,
  Edit3,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DashboardPage: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'scripts' | 'favorites' | 'settings'>('scripts');
  const [myScripts, setMyScripts] = useState<Script[]>([]);
  const [myFavorites, setMyFavorites] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      onOpenAuthModal();
      navigate('/');
    }
  }, [user, onOpenAuthModal, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch user's scripts (all statuses)
      const { data: scriptsData, error: scriptsErr } = await supabase
        .from('scripts')
        .select(`*, profiles:author_id (display_name, username, avatar_url)`)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (scriptsErr) throw scriptsErr;
      const parsedScripts = (scriptsData || []).map((s: any) => ({
        ...s,
        author_display_name: s.profiles?.display_name,
        author_username: s.profiles?.username,
        author_avatar_url: s.profiles?.avatar_url,
      }));
      setMyScripts(parsedScripts);

      // 2. Fetch favorites
      const { data: favsData, error: favsErr } = await supabase
        .from('script_favorites')
        .select(`script_id, scripts:script_id (*, profiles:author_id (display_name, username, avatar_url))`)
        .eq('user_id', user.id);

      if (favsErr) throw favsErr;
      const parsedFavs = (favsData || [])
        .map((f: any) => {
          const s = f.scripts;
          if (!s) return null;
          return {
            ...s,
            author_display_name: s.profiles?.display_name,
            author_username: s.profiles?.username,
            author_avatar_url: s.profiles?.avatar_url,
          };
        })
        .filter((item: any) => item !== null) as Script[];

      setMyFavorites(parsedFavs);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDeleteScript = async (scriptId: string, title: string) => {
    const confirmed = window.confirm(`آیا از حذف دائمی اسکریپت "${title}" مطمئن هستید؟`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('scripts').delete().eq('id', scriptId);
      if (error) throw error;
      toast.success('اسکریپت با موفقیت حذف شد');
      setMyScripts((prev) => prev.filter((s) => s.id !== scriptId));
    } catch (err: any) {
      toast.error('خطا در حذف اسکریپت: ' + (err.message || ''));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!displayName.trim() || !username.trim()) {
      toast.error('نام نمایشی و نام کاربری الزامی است');
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('پروفایل کاربری با موفقیت به‌روزرسانی شد');
    } catch (err: any) {
      toast.error('خطا در به‌روزرسانی پروفایل: ' + (err.message || ''));
    } finally {
      setSavingProfile(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            منتشر شده
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            در انتظار بررسی
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            رد شده
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            پیش‌نویس
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-10 bg-dark-800 rounded w-1/4 mb-8" />
        <div className="h-64 bg-dark-800 rounded w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Profile Area */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-dark-700 flex items-center justify-center font-black text-white text-2xl border border-electric-500/40 shadow-glow-sm shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              profile?.display_name?.[0] || 'U'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{profile?.display_name || 'کاربر گرامی'}</h1>
              {profile?.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  مدیر سایت
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-slate-400">@{profile?.username || 'user'}</p>
            {profile?.bio && <p className="text-xs text-slate-300 mt-2 max-w-xl">{profile.bio}</p>}
          </div>
        </div>

        <Link
          to="/upload"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all"
        >
          <Upload className="w-4 h-4" />
          <span>آپلود اسکریپت جدید</span>
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'scripts'
              ? 'border-electric-500 text-electric-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>اسکریپت‌های من ({myScripts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'favorites'
              ? 'border-electric-500 text-electric-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>علاقه‌مندی‌های من ({myFavorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-electric-500 text-electric-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>تنظیمات حساب کاربری</span>
        </button>
      </div>

      {/* Tab 1: My Scripts */}
      {activeTab === 'scripts' && (
        <div>
          {myScripts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myScripts.map((script) => (
                <div key={script.id} className="relative flex flex-col group">
                  <ScriptCard script={script} onRefresh={fetchDashboardData} />
                  {/* Dashboard status overlay & Delete */}
                  <div className="mt-2 flex items-center justify-between p-2.5 rounded-xl bg-dark-800/90 border border-white/10 text-xs">
                    <div>{getStatusBadge(script.status)}</div>
                    <button
                      onClick={() => handleDeleteScript(script.id, script.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف اسکریپت"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-lg mx-auto">
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">هنوز هیچ اسکریپتی آپلود نکرده‌اید</h3>
              <p className="text-sm text-slate-400 mb-6">
                اولین اسکریپت خود را منتشر کنید تا در لیست شما و نتایج جستجو نمایش داده شود!
              </p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-electric-500 text-dark-900 font-bold text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>آپلود اسکریپت</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Favorites */}
      {activeTab === 'favorites' && (
        <div>
          {myFavorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myFavorites.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onRefresh={fetchDashboardData}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-lg mx-auto">
              <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">لیست علاقه‌مندی‌های شما خالی است</h3>
              <p className="text-sm text-slate-400 mb-6">
                می‌توانید با کلیک روی آیکون ذخیره در هر اسکریپت، آن را به این بخش اضافه کنید.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-electric-500 text-dark-900 font-bold text-sm"
              >
                <span>مشاهده اسکریپت‌های سایت</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <User className="w-5 h-5 text-electric-400" />
            <span>ویرایش مشخصات پروفایل</span>
          </h2>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                نام نمایشی (Display Name)
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                نام کاربری (Username)
              </label>
              <div className="relative">
                <span className="text-slate-400 absolute right-4 top-3 text-sm">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-900 border border-white/15 rounded-xl pr-9 pl-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                بیوگرافی یا توضیحات کوتاه
              </label>
              <textarea
                rows={3}
                placeholder="توضیح مختصری درباره خودتان یا تخصص اسکریپت‌نویسی‌تان بنویسید..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500"
              />
            </div>

            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'در حال ذخیره...' : 'ذخیره تغییرات پروفایل'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
