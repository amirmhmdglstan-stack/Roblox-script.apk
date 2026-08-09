import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase, seedSampleScripts } from '../lib/supabase';
import { Script, ScriptFilterState } from '../types';
import { ScriptCard } from '../components/scripts/ScriptCard';
import { AdvancedSearchModal } from '../components/scripts/AdvancedSearchModal';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  SlidersHorizontal,
  Users,
  BookOpen,
  Rocket,
  Upload,
  Sparkles,
  RefreshCw,
  Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

const defaultFilters: ScriptFilterState = {
  query: '',
  exactMatch: false,
  verifiedOnly: false,
  allGames: false,
  patchedOnly: false,
  keyRequirement: '',
  scriptType: '',
  gameQuery: '',
  sortBy: 'created_at',
  sortOrder: 'new',
};

export const HomePage: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [totalScriptCount, setTotalScriptCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<ScriptFilterState>(defaultFilters);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const fetchScripts = useCallback(
    async (currentPage = 1, isLoadMore = false) => {
      setLoading(true);
      try {
        const pageSize = 12;
        const offset = (currentPage - 1) * pageSize;

        // Fetch real count from scripts table
        const { count } = await supabase
          .from('scripts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('visibility', 'public');

        if (count !== null) {
          setTotalScriptCount(count);
        }

        // Use search_scripts RPC for advanced filtering & search if available, or fallback to query builder
        let data: Script[] | null = null;
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('search_scripts', {
            p_query: filters.query || null,
            p_exact_match: filters.exactMatch,
            p_verified_only: filters.verifiedOnly,
            p_all_games: filters.allGames,
            p_patched_only: filters.patchedOnly,
            p_key_required: filters.keyRequirement || null,
            p_script_type: filters.scriptType || null,
            p_game_query: filters.gameQuery || null,
            p_sort_by: filters.sortBy,
            p_sort_order: filters.sortOrder,
            p_limit: pageSize + 1,
            p_offset: offset,
          });

          if (!rpcError && rpcData) {
            data = rpcData as Script[];
          }
        } catch (e) {
          // Fallback to standard Supabase select if RPC fails
        }

        if (!data) {
          let queryBuilder = supabase
            .from('scripts')
            .select(
              `*,
              profiles:author_id (display_name, username, avatar_url)`
            )
            .eq('status', 'published')
            .eq('visibility', 'public');

          if (filters.query) {
            if (filters.exactMatch) {
              queryBuilder = queryBuilder.ilike('title', filters.query);
            } else {
              queryBuilder = queryBuilder.or(
                `title.ilike.%${filters.query}%,game_name.ilike.%${filters.query}%,features.ilike.%${filters.query}%`
              );
            }
          }

          if (filters.gameQuery) {
            queryBuilder = queryBuilder.ilike('game_name', `%${filters.gameQuery}%`);
          }

          if (filters.verifiedOnly) {
            queryBuilder = queryBuilder.eq('is_verified', true);
          }

          if (filters.allGames) {
            queryBuilder = queryBuilder.eq('is_hub_or_universal', true);
          }

          if (filters.patchedOnly) {
            queryBuilder = queryBuilder.eq('is_patched', true);
          }

          if (filters.keyRequirement) {
            queryBuilder = queryBuilder.eq('key_requirement', filters.keyRequirement);
          }

          queryBuilder = queryBuilder
            .order(filters.sortBy, { ascending: filters.sortOrder === 'old' })
            .range(offset, offset + pageSize);

          const { data: selectData, error } = await queryBuilder;
          if (error) throw error;
          data = (selectData || []).map((row: any) => ({
            ...row,
            author_display_name: row.profiles?.display_name,
            author_username: row.profiles?.username,
            author_avatar_url: row.profiles?.avatar_url,
          }));
        }

        const hasNext = data.length > pageSize;
        const pageScripts = hasNext ? data.slice(0, pageSize) : data;

        setHasMore(hasNext);
        setScripts((prev) => (isLoadMore ? [...prev, ...pageScripts] : pageScripts));
      } catch (err: any) {
        console.error('Error fetching scripts:', err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    setPage(1);
    fetchScripts(1, false);
  }, [fetchScripts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchScripts(1, false);
  };

  const handleExactMatchToggle = (checked: boolean) => {
    setFilters((prev) => ({ ...prev, exactMatch: checked }));
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchScripts(nextPage, true);
  };

  const handleSeed = async () => {
    if (!user) {
      toast.error('برای بارگذاری نمونه اسکریپت ابتدا وارد حساب کاربری شوید.');
      onOpenAuthModal();
      return;
    }
    const toastId = toast.loading('در حال افزودن اسکریپت‌های نمونه به پایگاه داده...');
    const success = await seedSampleScripts(user.id);
    toast.dismiss(toastId);
    if (success) {
      toast.success('اسکریپت‌های نمونه با موفقیت در Supabase اضافه شدند!');
      fetchScripts(1, false);
    } else {
      toast.error('خطا در افزودن اسکریپت‌های نمونه.');
    }
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

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 glow-text">
            Roblox Script
          </h1>

          <p className="text-lg sm:text-2xl font-bold text-slate-200 mb-2 max-w-3xl mx-auto leading-relaxed">
            بهترین اسکریپت‌های موجود در سایت را پیدا کنید!
          </p>
          <p className="text-base sm:text-xl text-electric-400 font-semibold mb-10">
            همه توسط خود شما آپلود شده‌اند!
          </p>

          {/* Main Search Box Required by Spec */}
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto">
            <div className="relative flex items-center bg-dark-800/90 rounded-2xl border border-electric-500/40 hover:border-electric-500 focus-within:border-electric-500 focus-within:ring-2 focus-within:ring-electric-500/30 shadow-glow-sm transition-all duration-300 p-2">
              {/* Search Icon on RTL right */}
              <div className="pl-2 pr-3 text-electric-400">
                <Search className="w-6 h-6" />
              </div>

              {/* Text input */}
              <input
                type="text"
                placeholder="عنوان اسکریپت، بازی یا ویژگی مورد نظر خود را جستجو کنید..."
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                className="w-full bg-transparent text-white placeholder-slate-400 px-2 py-3 text-sm sm:text-base focus:outline-none"
              />

              {/* Action Buttons on Left */}
              <div className="flex items-center gap-2 pr-2 border-r border-white/10">
                {/* Advanced search modal button (sliders icon as required by prompt) */}
                <button
                  type="button"
                  onClick={() => setIsAdvancedModalOpen(true)}
                  title="تنظیمات جستجوی پیشرفته"
                  className="p-2.5 rounded-xl bg-dark-900/80 hover:bg-dark-700 text-electric-400 hover:text-white border border-electric-500/30 transition-all shrink-0"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>

                {/* Button labeled "جستجو" */}
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-black text-sm shadow-glow-sm hover:shadow-glow transition-all shrink-0"
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
                  checked={filters.exactMatch}
                  onChange={(e) => handleExactMatchToggle(e.target.checked)}
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

      {/* Recent scripts and search results Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-electric-500 animate-pulse" />
              <span>
                {filters.query || filters.verifiedOnly || filters.allGames || filters.patchedOnly
                  ? 'نتایج جستجوی اسکریپت‌ها'
                  : 'اسکریپت‌های اخیر'}
              </span>
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

            {/* Required visible button: "آپلود اسکریپت" */}
            <Link
              to="/upload"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>آپلود اسکریپت</span>
            </Link>
          </div>
        </div>

        {/* Loading Skeleton / Grid */}
        {loading && scripts.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="rounded-2xl bg-dark-800/60 border border-white/10 aspect-video animate-pulse" />
            ))}
          </div>
        ) : scripts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                  {loading ? 'در حال بارگذاری...' : 'نمایش اسکریپت‌های بیشتر'}
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
              اسکریپتی با این مشخصات یافت نشد
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              می‌توانید فیلترهای جستجو را بازنشانی کنید یا اولین کاربری باشید که در این بخش اسکریپت آپلود می‌کند!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setFilters(defaultFilters);
                  setTimeout(() => fetchScripts(1, false), 50);
                }}
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-bold transition-colors"
              >
                مشاهده همه اسکریپت‌ها
              </button>

              <button
                onClick={handleSeed}
                className="px-4 py-2 rounded-xl bg-electric-500/20 hover:bg-electric-500/30 border border-electric-500/50 text-electric-400 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>تزریق اسکریپت‌های نمونه برای تست</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Advanced Search Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
        }}
        onReset={() => {
          setFilters(defaultFilters);
        }}
      />
    </div>
  );
};
