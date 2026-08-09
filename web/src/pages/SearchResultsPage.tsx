import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Script } from '../types';
import { ScriptCard } from '../components/scripts/ScriptCard';
import { AdvancedSearchModal } from '../components/scripts/AdvancedSearchModal';
import { fetchScriptsWithFilters } from '../lib/fetchScripts';
import {
  defaultFilters,
  filtersToSearchString,
  hasActiveSearch,
  parseSearchParams,
} from '../lib/searchParams';
import { Home, Search, SlidersHorizontal, SearchX } from 'lucide-react';

const PAGE_SIZE = 12;

// Dedicated Google-style results page: searching from anywhere on the site
// lands here (/search?q=...) instead of replacing the home page sections.
export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();

  // Filters are ALWAYS derived from the URL so links are shareable and the
  // browser back/forward buttons navigate between searches naturally.
  const filters = useMemo(() => parseSearchParams(searchParams), [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [loadError, setLoadError] = useState<string>('');

  // Local search-box state (typed text applies to the URL on submit)
  const [inputQuery, setInputQuery] = useState(filters.query);
  const [inputExact, setInputExact] = useState(filters.exactMatch);

  // Re-sync the box whenever the URL changes (back/forward, new search)
  useEffect(() => {
    setInputQuery(filters.query);
    setInputExact(filters.exactMatch);
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchResults = useCallback(
    async (currentPage: number, isLoadMore: boolean) => {
      setLoading(true);
      setLoadError('');
      try {
        // Search results include ADMIN scripts too (pinned on top) — unlike the
        // home-page recent list where admin uploads live in their own section.
        const { scripts: list, hasMore: more } = await fetchScriptsWithFilters(
          filters,
          currentPage,
          PAGE_SIZE,
          false
        );
        setHasMore(more);
        setScripts((prev) => (isLoadMore ? [...prev, ...list] : list));
      } catch (err) {
        console.error('Error fetching search results:', err);
        setLoadError('مشکلی در دریافت نتایج پیش آمد؛ لطفاً دوباره تلاش کنید.');
      } finally {
        setLoading(false);
      }
    },
    [paramsKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    setPage(1);
    fetchResults(1, false);
  }, [fetchResults]);

  const applyFilters = (next: typeof filters) => {
    const search = filtersToSearchString(next);
    // If the URL would not change, react-router fires nothing — refetch manually
    // so pressing «جستجو» twice still refreshes the results.
    if (search === (paramsKey ? `?${paramsKey}` : '')) {
      setPage(1);
      fetchResults(1, false);
      return;
    }
    setSearchParams(search);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ ...filters, query: inputQuery.trim(), exactMatch: inputExact });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchResults(nextPage, true);
  };

  const activeSearch = hasActiveSearch(filters);
  const heading = filters.query
    ? `نتایج جستجو برای «${filters.query}»`
    : activeSearch
    ? 'نتایج با فیلترهای انتخابی'
    : 'همه اسکریپت‌ها';

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12">
        {/* Top row: home button + results heading */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 truncate">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-electric-400 shrink-0" />
              <span className="truncate">{heading}</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              نتایج در یک صفحه جدا نمایش داده می‌شود — با دکمه خانه به صفحه اصلی برگردید.
            </p>
          </div>

          <Link
            to="/"
            title="بازگشت به صفحه اصلی"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-dark-800 border border-electric-500/30 hover:border-electric-500 text-electric-400 hover:text-white text-xs sm:text-sm font-bold transition-all shrink-0"
          >
            <Home className="w-4 h-4" />
            <span className="hidden min-[420px]:inline">صفحه اصلی</span>
          </Link>
        </div>

        {/* Compact search bar (refine without leaving the results page) */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative flex items-center bg-dark-800/90 rounded-2xl border border-electric-500/40 focus-within:border-electric-500 focus-within:ring-2 focus-within:ring-electric-500/30 shadow-glow-sm transition-all duration-300 p-1.5">
            <div className="hidden sm:block pl-2 pr-3 text-electric-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="جستجوی اسکریپت، بازی یا ویژگی..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="w-full min-w-0 bg-transparent text-white placeholder-slate-400 px-1.5 sm:px-2 py-2 sm:py-2.5 text-sm focus:outline-none"
            />
            <div className="flex items-center gap-1.5 pr-1.5 border-r border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(true)}
                title="تنظیمات جستجوی پیشرفته"
                className="p-2 rounded-xl bg-dark-900/80 hover:bg-dark-700 text-electric-400 hover:text-white border border-electric-500/30 transition-all shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-black text-xs sm:text-sm shadow-glow-sm hover:shadow-glow transition-all shrink-0"
              >
                جستجو
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-start px-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={inputExact}
                onChange={(e) => setInputExact(e.target.checked)}
                className="w-4 h-4 accent-electric-500 rounded cursor-pointer"
              />
              <span>سخت‌گیری در جستجو (نتیجه دقیقاً با ورودی برابر باشد)</span>
            </label>
          </div>
        </form>

        {/* Active filter chips */}
        {activeSearch && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-[11px]">
            {filters.query && (
              <span className="px-2.5 py-1 rounded-full bg-electric-500/15 border border-electric-500/40 text-electric-300 font-bold">
                عبارت: {filters.query}
              </span>
            )}
            {filters.gameQuery && (
              <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-white/15 text-slate-300">
                بازی: {filters.gameQuery}
              </span>
            )}
            {filters.verifiedOnly && (
              <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-white/15 text-slate-300">فقط تأییدشده</span>
            )}
            {filters.allGames && (
              <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-white/15 text-slate-300">برای همه بازی‌ها</span>
            )}
            {filters.patchedOnly && (
              <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-white/15 text-slate-300">پچ‌شده</span>
            )}
            {filters.keyRequirement && (
              <span className="px-2.5 py-1 rounded-full bg-dark-800 border border-white/15 text-slate-300">
                {filters.keyRequirement === 'keyless' ? 'بدون نیاز به کلید' : 'نیاز به کلید'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSearchParams(filtersToSearchString(defaultFilters))}
              className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 font-bold transition-colors"
            >
              حذف همه فیلترها ✕
            </button>
          </div>
        )}

        {/* Results */}
        {loading && scripts.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="rounded-2xl bg-dark-800/60 border border-white/10 aspect-video animate-pulse"
              />
            ))}
          </div>
        ) : loadError && scripts.length === 0 ? (
          <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-white mb-2">خطا در دریافت نتایج</h3>
            <p className="text-sm text-slate-400 mb-6">{loadError}</p>
            <button
              onClick={() => fetchResults(1, false)}
              className="px-5 py-2.5 rounded-xl bg-electric-500 text-dark-900 font-bold text-sm"
            >
              تلاش مجدد
            </button>
          </div>
        ) : scripts.length > 0 ? (
          <>
            <p className="text-[11px] text-slate-500 mb-3 font-mono">
              {scripts.length.toLocaleString('fa-IR')} نتیجه نمایش داده شد
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {scripts.map((script) => (
                <ScriptCard
                  key={script.id}
                  script={script}
                  onRefresh={() => fetchResults(page, false)}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 rounded-xl bg-dark-800 border border-electric-500/40 hover:border-electric-500 text-electric-400 hover:text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'در حال بارگذاری...' : 'مشاهده نتایج بیشتر'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-xl mx-auto">
            <div className="inline-flex p-4 rounded-2xl bg-dark-700/50 text-slate-400 mb-4">
              <SearchX className="w-10 h-10 text-electric-500/70" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">اسکریپتی با این مشخصات یافت نشد</h3>
            <p className="text-sm text-slate-400 mb-6">
              عبارت دیگری را امتحان کنید، فیلترها را حذف کنید یا به صفحه اصلی برگردید.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/search"
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-bold transition-colors"
              >
                حذف فیلترها و دیدن همه
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-electric-500 text-dark-900 text-xs font-bold transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>صفحه اصلی</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <AdvancedSearchModal
        isOpen={isAdvancedOpen}
        onClose={() => setIsAdvancedOpen(false)}
        filters={filters}
        onApply={(newFilters) => applyFilters(newFilters)}
        onReset={() => setSearchParams('')}
      />
    </div>
  );
};
