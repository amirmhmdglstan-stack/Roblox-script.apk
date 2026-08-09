import { createClient } from '@supabase/supabase-js';
import { Script } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://feqlwhjvnhtbijwevsqk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'script-thumbnails';

// Generate a random session ID for online presence tracking
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('roblox_script_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    sessionStorage.setItem('roblox_script_session_id', sessionId);
  }
  return sessionId;
};

// Send heartbeat to track active online users & guests
export const sendHeartbeat = async (userId?: string | null) => {
  try {
    const sessionId = getSessionId();
    const isGuest = !userId;
    await supabase.rpc('heartbeat_presence', {
      p_session_id: sessionId,
      p_user_id: userId || null,
      p_is_guest: isGuest,
    });
  } catch (err) {
    // Silently handle if RPC is not yet created in Supabase
  }
};

// Fetch real online counts from Supabase (or fallback to simulated active counts)
export const getOnlineCounts = async (): Promise<{ registeredUsers: number; guestUsers: number }> => {
  try {
    const { data, error } = await supabase.rpc('get_online_counts');
    if (!error && data && data.length > 0) {
      return {
        registeredUsers: Number(data[0].registered_users || 1),
        guestUsers: Number(data[0].guest_users || 3),
      };
    }
  } catch (err) {
    // Ignore RPC error
  }
  return { registeredUsers: 2, guestUsers: 14 };
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
      throw new Error(uploadError.message || 'خطا در آپلود تصویر بندانگشتی');
    }
    const { data } = supabase.storage.from('script-thumbnails').getPublicUrl(filePath);
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
};

// Seed sample demo scripts into Supabase for testing if DB is empty
export const seedSampleScripts = async (userId: string): Promise<boolean> => {
  try {
    const sampleScripts = [
      {
        author_id: userId,
        title: 'اسکریپت اتوفارم و اسپید بلکس فروت (Blox Fruits Auto-Farm)',
        game_id: '2753915549',
        game_name: 'Blox Fruits',
        is_hub_or_universal: false,
        script_type: 'free',
        supported_games: ['Blox Fruits', 'King Legacy'],
        features: 'اتوفارم خودکار لول و کوئست‌ها، جمع‌آوری سریع میوه‌های شیطانی، تله‌پورت سریع بین جزیره‌ها، اسپید هک و وال‌هک بدون لگ.',
        tags: ['Blox Fruits', 'AutoFarm', 'ESP', 'Speed', 'لِوِل آپ'],
        script_content: `-- Blox Fruits Ultimate Auto-Farm & ESP Hub
-- Created for Roblox Script Community Platform
loadstring(game:HttpGet("https://raw.githubusercontent.com/example/robloxscript/main/bloxfruits.lua"))()
print("Blox Fruits Script Loaded Successfully!")`,
        commit_message: 'بهبود سرعت اتوفارم و رفع باگ جزیره سوم',
        visibility: 'public',
        key_requirement: 'keyless',
        is_patched: false,
        is_verified: true,
        slug: 'blox-fruits-autofarm-hub-' + Math.random().toString(36).substring(2, 7),
        status: 'published',
        view_count: 1420,
        like_count: 312,
        dislike_count: 8,
        favorite_count: 95,
      },
      {
        author_id: userId,
        title: 'اسکریپت هاب عمومی آرسنال (Universal FPS & Aimbot Hub)',
        game_id: '286090429',
        game_name: 'Arsenal',
        is_hub_or_universal: true,
        script_type: 'free',
        supported_games: ['Arsenal', 'Phantom Forces', 'BedWars', 'Counter Blox'],
        features: 'ایم‌بات پیشرفته با قابلیت Silent Aim، ای‌اس‌پی (ESP) دشمنان با نمایش فاصله و نوار سلامت، تنظیم خودکار زاویه تیراندازی و آنتی لگ.',
        tags: ['Aimbot', 'ESP', 'Universal Hub', 'FPS', 'آرسنال'],
        script_content: `-- Universal FPS Aimbot & Visuals Hub
-- Works across 15+ popular FPS games on Roblox
local getasset = getsynasset or getcustomasset
print("Universal Hub Loaded! Press RIGHT SHIFT to toggle GUI.")`,
        commit_message: 'پشتیبانی از آپدیت جدید آنتی چیت بازی',
        visibility: 'public',
        key_requirement: 'key_required',
        is_patched: false,
        is_verified: true,
        slug: 'universal-fps-aimbot-hub-' + Math.random().toString(36).substring(2, 7),
        status: 'published',
        view_count: 2890,
        like_count: 540,
        dislike_count: 22,
        favorite_count: 210,
      },
      {
        author_id: userId,
        title: 'اسکریپت شبیه‌ساز پت ایکس (Pet Simulator X Auto-Hatch)',
        game_id: '6284583030',
        game_name: 'Pet Simulator X',
        is_hub_or_universal: false,
        script_type: 'free',
        supported_games: ['Pet Simulator X', 'Pet Simulator 99'],
        features: 'باز کردن خودکار تخم‌ها (Auto-Hatch 8x)، ادغام پت‌ها با سرعت بالا، جمع‌آوری تمام سکه‌ها و الماس‌های اطراف نقشه.',
        tags: ['Pet Simulator', 'AutoHatch', 'Gems', 'تخم‌گذاری خودکار'],
        script_content: `-- Pet Simulator X & 99 Auto-Hatch Pro Script
local Library = loadstring(game:HttpGet("https://raw.githubusercontent.com/example/ui/main.lua"))()
Library:Notify("اسکریپت با موفقیت فعال شد!")`,
        commit_message: 'افزودن قابلیت جمع‌آوری الماس‌های غول‌پیکر',
        visibility: 'public',
        key_requirement: 'keyless',
        is_patched: false,
        is_verified: false,
        slug: 'pet-sim-x-auto-hatch-' + Math.random().toString(36).substring(2, 7),
        status: 'published',
        view_count: 850,
        like_count: 120,
        dislike_count: 4,
        favorite_count: 38,
      },
    ];

    for (const item of sampleScripts) {
      await supabase.from('scripts').insert(item);
    }
    return true;
  } catch (err) {
    console.error('Error seeding demo scripts:', err);
    return false;
  }
};
