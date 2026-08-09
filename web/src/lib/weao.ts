import { WeaoExploit, WeaoVersions, WeaoSuncData } from '../types';

// Frontend helpers for the server-side WEAO proxy (server.js sets the required
// WEAO-3PService User-Agent header, which browsers are not allowed to set).

const handleError = async (res: Response): Promise<never> => {
  if (res.status === 429) {
    throw new Error('RATE_LIMITED');
  }
  const body = await res.json().catch(() => ({}));
  throw new Error(body?.error || 'WEAO_FETCH_FAILED');
};

// Fetch all exploit statuses (hidden ones filtered out, like the WEAO frontend)
export const fetchExploits = async (): Promise<WeaoExploit[]> => {
  const res = await fetch('/api/exploits');
  if (!res.ok) return handleError(res);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter((e: WeaoExploit) => e && e.title && !e.hidden);
};

// Fetch current Roblox versions per platform (may be null — page must tolerate that)
export const fetchRobloxVersions = async (): Promise<WeaoVersions | null> => {
  try {
    const res = await fetch('/api/versions/current');
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && !data.error ? data : null;
  } catch {
    return null;
  }
};

// Fetch detailed sUNC test results for one exploit (lazy / on demand)
export const fetchSuncData = async (scrap: string, key: string): Promise<WeaoSuncData | null> => {
  try {
    const res = await fetch(`/api/sunc?scrap=${encodeURIComponent(scrap)}&key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' && !data.error ? data : null;
  } catch {
    return null;
  }
};
