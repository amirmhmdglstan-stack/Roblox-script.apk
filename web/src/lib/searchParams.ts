import { ScriptFilterState } from '../types';

// ============================================================
// Search filter ⇄ URL helpers
// Keeps /search URL params and the filter state object in sync so the
// results page behaves like a real search engine (shareable links,
// browser back/forward works, refreshing keeps the query).
// ============================================================

export const defaultFilters: ScriptFilterState = {
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

const VALID_SORT_BY = new Set([
  'created_at',
  'updated_at',
  'view_count',
  'like_count',
  'dislike_count',
  'similarity',
]);

export const filtersToSearchString = (f: ScriptFilterState): string => {
  const p = new URLSearchParams();
  if (f.query) p.set('q', f.query);
  if (f.exactMatch) p.set('exact', '1');
  if (f.verifiedOnly) p.set('verified', '1');
  if (f.allGames) p.set('allgames', '1');
  if (f.patchedOnly) p.set('patched', '1');
  if (f.keyRequirement) p.set('key', f.keyRequirement);
  if (f.scriptType) p.set('type', f.scriptType);
  if (f.gameQuery) p.set('game', f.gameQuery);
  if (f.sortBy && f.sortBy !== 'created_at') p.set('sortBy', f.sortBy);
  if (f.sortOrder && f.sortOrder !== 'new') p.set('sortOrder', f.sortOrder);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const parseSearchParams = (params: URLSearchParams): ScriptFilterState => {
  const sortBy = params.get('sortBy');
  const key = params.get('key');
  const type = params.get('type');
  return {
    query: params.get('q') || '',
    exactMatch: params.get('exact') === '1',
    verifiedOnly: params.get('verified') === '1',
    allGames: params.get('allgames') === '1',
    patchedOnly: params.get('patched') === '1',
    keyRequirement:
      key === 'key_required' || key === 'keyless' ? key : '',
    scriptType: type === 'free' ? 'free' : '',
    gameQuery: params.get('game') || '',
    sortBy: (sortBy && VALID_SORT_BY.has(sortBy) ? sortBy : 'created_at') as ScriptFilterState['sortBy'],
    sortOrder: params.get('sortOrder') === 'old' ? 'old' : 'new',
  };
};

/** True when the user has actually asked for something (query or any filter). */
export const hasActiveSearch = (f: ScriptFilterState): boolean =>
  !!(
    f.query ||
    f.gameQuery ||
    f.exactMatch ||
    f.verifiedOnly ||
    f.allGames ||
    f.patchedOnly ||
    f.keyRequirement ||
    f.scriptType
  );
