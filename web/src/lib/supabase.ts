import { createClient } from '@supabase/supabase-js';
import { toPersianMessage } from './errors';

// NOTE: The Supabase anon (public) key is safe to expose in the browser —
// access is enforced by Row-Level Security on the server. These fallbacks keep
// the app working even when the VITE_* env vars were not set at build time.
// IMPORTANT: an empty key makes createClient() throw at module load, which
// crashes React before it mounts (causing a blank white page). Never leave it empty!
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://feqlwhjvnhtbijwevsqk.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcWx3aGp2bmh0Ymlqd2V2c3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NjEzMDcsImV4cCI6MjEwMTQzNzMwN30.AspYCY2j15XvWx4bOM31oU3jUEh72fOu0vyErKOGW1Q';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars are missing — using built-in fallbacks. Set them in Render → Environment for production.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'script-thumbnails';

// Generate a persistent session ID for online presence tracking.
// Stored in localStorage (not sessionStorage) so 10 open tabs of the same
// browser count as ONE online visitor instead of 10 fake ones.
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('roblox_script_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('roblox_script_session_id', sessionId);
  }
  return sessionId;
};

// A visitor is considered "online" if they pinged within this window
const ONLINE_WINDOW_MINUTES = 5;

const getOnlineSinceISO = () =>
  new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000).toISOString();

let warnedAboutPresenceSetup = false;
const warnPresenceSetupOnce = (err: any) => {
  if (!warnedAboutPresenceSetup) {
    warnedAboutPresenceSetup = true;
    console.warn(
      '⚠️ Presence RPC not available — falling back to direct table access. ' +
        'For best results run supabase_setup.sql in your Supabase SQL Editor.',
      err?.message || err
    );
  }
};

// Send heartbeat to track active online users & guests.
// Tries the SECURITY DEFINER RPC first; falls back to a direct upsert
// (the "Anyone can insert or update presence" RLS policy allows it).
export const sendHeartbeat = async (userId?: string | null) => {
  try {
    const sessionId = getSessionId();
    const isGuest = !userId;
    const { error } = await supabase.rpc('heartbeat_presence', {
      p_session_id: sessionId,
      p_user_id: userId || null,
      p_is_guest: isGuest,
    });

    if (error) {
      warnPresenceSetupOnce(error);
      // Direct fallback: upsert presence row + clean up stale ones
      await supabase.from('online_presence').upsert(
        {
          session_id: sessionId,
          user_id: userId || null,
          is_guest: isGuest,
          last_seen: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );
    }
  } catch (err) {
    // Presence tracking must never break the app
  }
};

// Fetch REAL online counts from Supabase (only visitors pinged in the last
// 5 minutes count as online — never fake or "total" numbers).
export const getOnlineCounts = async (): Promise<{ registeredUsers: number; guestUsers: number }> => {
  // 1) Preferred: RPC (also purges stale rows server-side)
  try {
    const { data, error } = await supabase.rpc('get_online_counts');
    if (!error && data && data.length > 0) {
      return {
        registeredUsers: Number(data[0].registered_users) || 0,
        guestUsers: Number(data[0].guest_users) || 0,
      };
    }
    if (error) warnPresenceSetupOnce(error);
  } catch (err) {
    // fall through to the direct query
  }

  // 2) Fallback: count recent rows directly (respects the 5-minute online window)
  try {
    const since = getOnlineSinceISO();
    const [{ count: registered }, { count: guests }] = await Promise.all([
      supabase
        .from('online_presence')
        .select('session_id', { count: 'exact', head: true })
        .eq('is_guest', false)
        .gte('last_seen', since),
      supabase
        .from('online_presence')
        .select('session_id', { count: 'exact', head: true })
        .or('is_guest.eq.true,user_id.is.null')
        .gte('last_seen', since),
    ]);

    if (registered !== null || guests !== null) {
      // Show at least yourself — you are obviously online right now
      return {
        registeredUsers: registered ?? 0,
        guestUsers: Math.max(1, guests ?? 0),
      };
    }
  } catch (err) {
    // fall through
  }

  // 3) Last resort: at least show yourself (never fabricated totals)
  return { registeredUsers: 0, guestUsers: 1 };
};

// Upload thumbnail image to Supabase Storage
export const uploadThumbnail = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `thumbnails/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    // Try fallback to script-thumbnails bucket if primary bucket isn't available
    const { error: fallbackError } = await supabase.storage
      .from('script-thumbnails')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (fallbackError) {
      throw new Error(toPersianMessage(uploadError.message, 'خطا در آپلود تصویر بندانگشتی'));
    }
    const { data } = supabase.storage.from('script-thumbnails').getPublicUrl(filePath);
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};
