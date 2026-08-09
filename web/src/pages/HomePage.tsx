import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Script, ScriptFilterState } from '../types';
import { ScriptCard } from '../components/scripts/ScriptCard';
import { AdvancedSearchModal } from '../components/scripts/AdvancedSearchModal';
import { fetchScriptsWithFilters } from '../lib/fetchScripts';
import { defaultFilters, filtersToSearchString } from '../lib/searchParams';
import {
  Search,
  SlidersHorizontal,
  Users,
  BookOpen,
  Rocket,
  Upload,
  RefreshCw,
  Terminal,
  Crown
} from 'lucide-react';

const RECENT_PAGE_SIZE = 4;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [totalScriptCount, setTotalScriptCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // The hero search-box state. Nothing is filtered on THIS page anymore —
  // submitting always opens the dedicated /search results page (Google-style).
  const [searchFilters, setSearchFilters] = useState<ScriptFilterState>(defaultFilters);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  // «اسکریپت های ادمین» showcase strip (4 by default, expandable to all)
  const [adminScripts, setAdminScripts] = useState<Script[]>([]);
  const [adminHasMore, setAdminHasMore] = useState<boolean>(false);
  const [adminExpanded, setAdminExpanded] = useState<boolean>(false);

  const fetchAdminScripts = useCallback(async (expanded: boolean) => {
    try {
      // Default view shows exactly 4 — fetch 5 only to know whether «مشاهده بیشتر» is needed
      const limit = expanded ? 64 : 5;
      const { data, error } = await supabase
        .from('scripts')
        .select(`*, profiles:author_id!inner (display_name, username, avatar_url, role)`)
        .eq('profiles.role', 'admin')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        ...row,
        author_display_name: row.profiles?.display_name,
        author_username: row.profiles?.username,
        author_avatar_url: row.profiles?.avatar_url,
        author_role: row.profiles?.role,
      }));

      if (expanded) {
        setAdminHasMore(false);
        setAdminScripts(rows);
      } else {
        setAdminHasMore(rows.length > 4);
        setAdminScripts(rows.slice(0, 4));
      }
    } catch (err) {
      console.error('Error fetching admin scripts:', err);
    }
  }, []);

  useEffect(() => {
    fetchAdminScripts(false);
  }, [fetchAdminScripts]);

  // Recent scripts — admin uploads are excluded here because they have their
  // own dedicated «اسکریپت های ادمین» section above.
  const fetchScripts = useCallback(async (currentPage = 1, isLoadMore = false) => {
    setLoading(true);
    try {
      // Fetch real count from scripts table (for the hero stats card)
      const { count } = await supabase
        .from('scripts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('visibility', 'public');

      if (count !== null) {
        setTotalScriptCount(count);
      }

      const { scripts: list, hasMore: more } = await fetchScriptsWithFilters(
        defaultFilters,
        currentPage,
        RECENT_PAGE_SIZE,
        true
      );

      setHasMore(more);
      setScripts((prev) => (isLoadMore ? [...prev, ...list] : list));
    } catch (err: any) {
      console.error('Error fetching scripts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchScripts(1, false);
  }, [fetchScripts]);

  // Any search (even an empty one) opens the dedicated results page
  const goToSearch = (filters: ScriptFilterState) => {
    navigate(`/search${filtersToSearchString(filters)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToSearch({ ...searchFilters, query: searchFilters.query.trim() });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchScripts(nextPage, true);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-16 pb-14 overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-hero-glow pointer-events-none blur-3xl opacity-80" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono mb-6 animate-pulse">
            <Terminal className="w-3.5 h-3.5" />
            <span>پلتفرم تخصصی اسکریپت‌های فارسی روبلاکس</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 glow-text">
            Roblox Script
          </h1>

          <p className="text-lg sm:text-2xl font-bold text-slate-200 mb-2 max-w-3xl mx-auto leading-relaxed">
            بهترین اسکریپت‌های موجود در سایت را پیدا کنید!
          </p>
          <p className="text-base sm:text-xl text-electric-400 font-semibold mb-10">
            همه توسط خود شما آپلود شده‌اند!
          </p>

          {/* Main Search Box — submits to the dedicated /search results page */}
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-dark-800/90 rounded-2xl border border-electric-500/40 hover:border-electric-500 focus-within:border-electric-500 focus-within:ring-2 focus-within:ring-electric-500/30 shadow-glow-sm transition-all duration-300 p-1.5 sm:p-2">
              {/* Search Icon on RTL right (hidden on tiny screens to save space) */}
              <div className="hidden sm:block pl-2 pr-3 text-electric-400">
                <Search className="w-6 h-6" />
              </div>

              {/* Text input */}
              <input
                type="text"
                placeholder="جستجوی اسکریپت، بازی یا ویژگی..."
                value={searchFilters.query}
                onChange={(e) =>
                  setSearchFilters((prev) => ({ ...prev, query: e.target.value }))
                }
                className="w-full min-w-0 bg-transparent text-white placeholder-slate-400 px-1.5 sm:px-2 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none"
              />

              {/* Action Buttons on Left */}
              <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2 border-r border-white/10 shrink-0">
                {/* Advanced search modal button (sliders icon as required by prompt) */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedModalOpen(true)}
                  title="تنظیمات جستجوی پیشرفته"
                  className="p-2 sm:p-2.5 rounded-xl bg-dark-900/80 hover:bg-dark-700 text-electric-400 hover:text-white border border-electric-500/30 transition-all shrink-0"
                >
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Button labeled "جستجو" */}
                <button
                  type="submit"
                  className="px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-black text-xs sm:text-sm shadow-glow-sm hover:shadow-glow transition-all shrink-0"
                >
                  جستجو
                </button>
              </div>
            </div>

            {/* Exact-match switch below search */}
            <div className="mt-4 flex items-center justify-center sm:justify-start">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-slate-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={searchFilters.exactMatch}
                  onChange={(e) =>
                    setSearchFilters((prev) => ({ ...prev, exactMatch: e.target.checked }))
                  }
                  className="w-4 h-4 accent-electric-500 rounded cursor-pointer"
                />
                <span>سخت‌گیری در جستجو (نتیجه دقیقاً با ورودی برابر باشد)</span>
              </label>
            </div>
          </form>
        </div>
      </section>

      {/* Informational Cards Section (3 Responsive Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Users / two people */}
          <div className="glass-card rounded-2xl p-6 glass-card-hover flex flex-col justify-between">
            <div>
              <div className="inline-flex p-3 rounded-xl bg-electric-500/15 border border-electric-500/30 text-electric-400 mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">کاربران فعال</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                به جمع کاربران فعالی بپیوندید که اسکریپت‌های خود را منتشر می‌کنند!
              </p>
            </div>
          </div>

          {/* Card 2: Open book */}
          <div className="glass-card rounded-2xl p-6 glass-card-hover flex flex-col justify-between">
            <div>
              <div className="inline-flex p-3 rounded-xl bg-electric-500/15 border border-electric-500/30 text-electric-400 mb-4">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">مجموعه کامل</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                با آپلودهای کاربران و بیش از{' '}
                <span className="font-mono font-black text-electric-400">
                  {totalScriptCount > 0 ? totalScriptCount.toLocaleString('fa-IR') : '۴+'}
                </span>{' '}
                اسکریپت در کل، انتخاب‌های شما تقریباً بی‌نهایت هستند!
              </p>
            </div>
          </div>

          {/* Card 3: Rocket */}
          <div className="glass-card rounded-2xl p-6 glass-card-hover flex flex-col justify-between">
            <div>
              <div className="inline-flex p-3 rounded-xl bg-electric-500/15 border border-electric-500/30 text-electric-400 mb-4">
                <Rocket className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">می‌خواهی اسکریپت تو هم دیده شود؟</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                اسکریپتی داری که می‌خواهی دیده شود؟ به جامعه در حال رشد Roblox Script بپیوند، آپلود کن و بگذار بقیه اسکریپتت را ببینند!
              </p>
            </div>
            <div>
              <Link
                to="/upload"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-electric-400 hover:text-electric-300 underline"
              >
                <span>شروع آپلود اسکریپت</span>
                <span>←</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ اسکریپت های ادمین (admin uploads only) ============ */}
      {adminScripts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 pt-2">
          <div className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-b from-amber-500/[0.07] via-dark-800/40 to-transparent p-4 sm:p-6 shadow-[0_0_35px_rgba(251,191,36,0.10)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-amber-400/20 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" />
                  <span>اسکریپت های ادمین</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  اسکریپت‌هایی که مستقیماً توسط مدیران سایت آپلود شده‌اند 👑
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                آپلودهای رسمی مدیریت
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {adminScripts.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onRefresh={() => fetchAdminScripts(adminExpanded)}
                />
              ))}
            </div>

            {(adminHasMore || adminExpanded) && (
              <div className="mt-8 text-center">
                {adminHasMore && (
                  <button
                    onClick={() => {
                      setAdminExpanded(true);
                      fetchAdminScripts(true);
                    }}
                    className="px-8 py-3 rounded-xl bg-amber-400/10 border border-amber-400/50 hover:border-amber-300 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200 font-bold text-sm transition-all"
                  >
                    مشاهده بیشتر
                  </button>
                )}
                {adminExpanded && (
                  <button
                    onClick={() => {
                      setAdminExpanded(false);
                      fetchAdminScripts(false);
                    }}
                    className="px-8 py-3 rounded-xl bg-dark-800 border border-white/15 hover:border-amber-400/50 text-slate-300 hover:text-white font-bold text-sm transition-all"
                  >
                    مشاهده کمتر
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent scripts Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-electric-500 animate-pulse" />
              <span>اسکریپت‌های اخیر</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              مجموعه‌ای از جدیدترین و محبوب‌ترین اسکریپت‌های روبلاکس بارگذاری‌شده توسط کاربران
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchScripts(1, false)}
              className="p-2.5 rounded-xl bg-dark-800 border border-white/10 hover:border-electric-500/50 text-slate-400 hover:text-white transition-colors"
              title="به‌روزرسانی لیست"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Required visible button: "آپلود اسکریپت" — compact on mobile */}
            <Link
              to="/upload"
              title="آپلود اسکریپت"
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-xs sm:text-sm shadow-glow-sm hover:shadow-glow transition-all shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden min-[420px]:inline">آپلود اسکریپت</span>
            </Link>
          </div>
        </div>

        {/* Loading Skeleton / Grid */}
        {loading && scripts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="rounded-2xl bg-dark-800/60 border border-white/10 aspect-video animate-pulse" />
            ))}
          </div>
        ) : scripts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {scripts.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onRefresh={() => fetchScripts(page, false)}
                />
              ))}
            </div>

            {/* Real Pagination / Load More Button */}
            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-dark-800 border border-electric-500/40 hover:border-electric-500 text-electric-400 hover:text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'در حال بارگذاری...' : 'مشاهده بیشتر'}
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-xl mx-auto">
            <div className="inline-flex p-4 rounded-2xl bg-dark-700/50 text-slate-400 mb-4">
              <Search className="w-10 h-10 text-electric-500/70" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              هنوز اسکریپتی منتشر نشده است
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              اولین کاربری باشید که در این بخش اسکریپت آپلود می‌کند!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fetchScripts(1, false)}
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-bold transition-colors"
              >
                تلاش مجدد
              </button>
              <Link
                to="/search"
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-bold transition-colors"
              >
                مشاهده همه اسکریپت‌ها
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Advanced Search Modal — applying it opens the dedicated results page */}
      <AdvancedSearchModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        filters={searchFilters}
        onApply={(newFilters) => {
          setSearchFilters(newFilters);
          goToSearch(newFilters);
        }}
        onReset={() => {
          setSearchFilters(defaultFilters);
        }}
      />
    </div>
  );
};
