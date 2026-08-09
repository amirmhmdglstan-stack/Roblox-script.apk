import { supabase } from './supabase';
import { Script, ScriptFilterState } from '../types';

// ============================================================
// Shared script-list fetching (search_scripts RPC + safe fallback)
// Used by the home page (recent scripts) AND the dedicated /search
// results page so the two never drift apart.
// ============================================================

export interface FetchScriptsResult {
  scripts: Script[];
  hasMore: boolean;
}

/** Map a joined row (with embedded profiles) onto the flat Script shape. */
const normalizeRow = (row: any): Script => ({
  ...row,
  author_display_name: row.profiles?.display_name ?? row.author_display_name,
  author_username: row.profiles?.username ?? row.author_username,
  author_avatar_url: row.profiles?.avatar_url ?? row.author_avatar_url,
  author_role: row.profiles?.role ?? row.author_role,
});

/** Admin-uploaded scripts ALWAYS on top (stable — inner order is kept). */
export const adminFirst = (list: Script[]): Script[] =>
  [...list].sort(
    (a, b) => (b.author_role === 'admin' ? 1 : 0) - (a.author_role === 'admin' ? 1 : 0)
  );

/**
 * Escape user input before embedding it in a PostgREST `.or(...)` / `.ilike(...)`
 * string — otherwise a query containing commas, parens or backslashes breaks
 * the whole filter expression (search silently returning nothing / erroring).
 */
const escapeIlike = (raw: string): string =>
  raw.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[(),]/g, ' ');

export const fetchScriptsWithFilters = async (
  filters: ScriptFilterState,
  page: number,
  pageSize: number,
  excludeAdmin: boolean
): Promise<FetchScriptsResult> => {
  const offset = (page - 1) * pageSize;

  // Preferred path: the advanced search_scripts RPC
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
      p_exclude_admin: excludeAdmin,
    });

    if (!rpcError && rpcData) {
      data = (rpcData as any[]).map(normalizeRow);
    }
  } catch (e) {
    // Fallback to the plain query builder below
  }

  if (!data) {
    let queryBuilder = supabase
      .from('scripts')
      .select(
        excludeAdmin
          ? `*, profiles:author_id!inner (display_name, username, avatar_url, role)`
          : `*, profiles:author_id (display_name, username, avatar_url, role)`
      )
      .eq('status', 'published')
      .eq('visibility', 'public');

    if (excludeAdmin) {
      queryBuilder = queryBuilder.not('profiles.role', 'eq', 'admin');
    }

    if (filters.query) {
      const q = escapeIlike(filters.query.trim());
      if (q) {
        if (filters.exactMatch) {
          queryBuilder = queryBuilder.ilike('title', q);
        } else {
          queryBuilder = queryBuilder.or(
            `title.ilike.%${q}%,game_name.ilike.%${q}%,features.ilike.%${q}%`
          );
        }
      }
    }

    if (filters.gameQuery) {
      const g = escapeIlike(filters.gameQuery.trim());
      if (g) queryBuilder = queryBuilder.ilike('game_name', `%${g}%`);
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

    // 'similarity' only exists inside the search_scripts RPC, not as a real
    // column — fall back to created_at so the query builder never errors out.
    const sortColumn = filters.sortBy === 'similarity' ? 'created_at' : filters.sortBy;

    queryBuilder = queryBuilder
      .order(sortColumn, { ascending: filters.sortOrder === 'old' })
      .range(offset, offset + pageSize);

    const { data: selectData, error } = await queryBuilder;
    if (error) throw error;
    data = (selectData || []).map(normalizeRow);
  }

  const hasMore = data.length > pageSize;
  const pageScripts = hasMore ? data.slice(0, pageSize) : data;

  return { scripts: adminFirst(pageScripts), hasMore };
};
