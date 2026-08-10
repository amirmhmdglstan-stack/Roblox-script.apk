// Client-side fallback when LLM providers are down — still answers from live site data.
// Mirrors logic in web/server.js and MainActivity.kt

import { supabase } from './supabase';
import { fetchExploits, fetchRobloxVersions } from './weao';
import type { WeaoExploit, WeaoVersions } from '../types';

interface ScriptRow {
  title: string;
  game_name: string;
  features?: string;
  tags?: string[];
  view_count?: number;
  like_count?: number;
  is_verified?: boolean;
  author_id?: string;
  profiles?: { display_name?: string; username?: string; role?: string };
}

interface PublisherAgg {
  name: string;
  username: string;
  role: string;
  scripts: number;
  views: number;
  likes: number;
  verified: number;
}

let cachedScripts: ScriptRow[] | null = null;
let cachedExploits: WeaoExploit[] | null = null;
let cachedVersions: WeaoVersions | null = null;
let cachedAt = 0;
const TTL = 5 * 60 * 1000;

async function getLiveData() {
  const now = Date.now();
  if (cachedScripts && cachedExploits && now - cachedAt < TTL) {
    return { scripts: cachedScripts, exploits: cachedExploits, versions: cachedVersions };
  }

  const [scripts, exploits, versions] = await Promise.allSettled([
    // top 80 scripts
    (async () => {
      const { data } = await supabase
        .from('scripts')
        .select('title,game_name,features,tags,view_count,like_count,is_verified,author_id,profiles:author_id(display_name,username,role)')
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('view_count', { ascending: false })
        .limit(80);
      return (data as any[]) || [];
    })(),
    fetchExploits().catch(() => [] as WeaoExploit[]),
    fetchRobloxVersions().catch(() => null),
  ]);

  const s = scripts.status === 'fulfilled' ? (scripts.value as ScriptRow[]) : [];
  const e = exploits.status === 'fulfilled' ? (exploits.value as WeaoExploit[]) : [];
  const v = versions.status === 'fulfilled' ? (versions.value as WeaoVersions | null) : null;

  cachedScripts = s;
  cachedExploits = e;
  cachedVersions = v;
  cachedAt = now;

  return { scripts: s, exploits: e, versions: v };
}

function tokenize(q: string): string[] {
  return q.toLowerCase().split(/[\s,؛،.\n]+/).filter((w) => w.length > 2);
}

function scoreScript(s: ScriptRow, tokens: string[], raw: string): number {
  const title = (s.title || '').toLowerCase();
  const game = (s.game_name || '').toLowerCase();
  const tags = Array.isArray(s.tags) ? s.tags.join(' ').toLowerCase() : '';
  const feats = (s.features || '').toLowerCase();
  const hay = `${title} ${game} ${tags} ${feats}`;
  let sc = 0;
  for (const t of tokens) {
    if (hay.includes(t)) sc += 2;
    if (game.includes(t)) sc += 3;
    if (title.includes(t)) sc += 3;
  }
  if (raw.toLowerCase().includes(game) && game) sc += 10;
  return sc;
}

function buildPublishers(scripts: ScriptRow[]): PublisherAgg[] {
  const map = new Map<string, PublisherAgg>();
  for (const s of scripts) {
    const p = s.profiles || {};
    const key = s.author_id || p.username || 'anon';
    if (!map.has(key)) {
      map.set(key, {
        name: p.display_name || p.username || 'ناشناس',
        username: p.username || '',
        role: p.role || 'user',
        scripts: 0,
        views: 0,
        likes: 0,
        verified: 0,
      });
    }
    const cur = map.get(key)!;
    cur.scripts += 1;
    cur.views += s.view_count || 0;
    cur.likes += s.like_count || 0;
    if (s.is_verified) cur.verified += 1;
  }
  return [...map.values()].sort((a, b) => b.scripts - a.scripts || b.views - a.views).slice(0, 25);
}

export async function getClientSideFallbackReply(queryText: string): Promise<string> {
  const q = queryText.trim();
  if (!q) return 'سلام! بگو دنبال چه اسکریپت یا اکسپلویتی هستی تا راهنماییت کنم.';
  const low = q.toLowerCase();
  const { scripts, exploits } = await getLiveData();
  const publishers = buildPublishers(scripts);

  const imageWords = ['عکس', 'تصویر', 'نقاشی', 'بکش', 'طراحی', 'draw', 'paint', 'generate an image', 'create an image'];
  if (imageWords.some((w) => low.includes(w))) {
    return 'من فقط متن تولید می‌کنم و قابلیت ساخت تصویر ندارم 🙏\nولی خوشحال می‌شم درباره اسکریپت‌ها یا اکسپلویت‌های سایت راهنماییت کنم!';
  }

  // Publisher
  if (
    low.includes('ناشر') ||
    low.includes('پابلیشر') ||
    low.includes('آپلود') ||
    low.includes('uploader') ||
    low.includes('publisher')
  ) {
    if (publishers.length === 0) {
      return 'در حال حاضر اطلاعات ناشران در دسترس نیست، ولی می‌تونی در بخش اسکریپت‌ها، نام ناشر هر اسکریپت را ببینی. اسکریپت‌های مدیران سایت 👑 همیشه تأییدشده هستند.';
    }
    const list = publishers.slice(0, 8).map((p) => {
      const icon = p.role === 'admin' ? '👑' : '👤';
      return `${icon} **${p.name}**${p.username ? ` (@${p.username})` : ''} — ${p.scripts} اسکریپت، ${p.views} بازدید`;
    }).join('\n');
    return `فعال‌ترین ناشران سایت:\n\n${list}\n\nبرای دیدن همه اسکریپت‌های یک ناشر، وارد پروفایلش شو.`;
  }

  // Exploit
  if (
    low.includes('اکسپلویت') ||
    low.includes('exploit') ||
    low.includes('executor') ||
    low.includes('wave') ||
    low.includes('solara') ||
    low.includes('delta')
  ) {
    if (!exploits.length) return 'لیست اکسپلویت‌ها فعلاً در دسترس نیست — صفحه اکسپلویت‌ها را باز کن.';
    const tokens = tokenize(q);
    const scored = exploits
      .map((e) => {
        const hay = `${e.title} ${e.platform}`.toLowerCase();
        let sc = 0;
        for (const t of tokens) if (hay.includes(t)) sc += 1;
        return { e, sc };
      })
      .filter((x) => x.sc > 0)
      .sort((a, b) => b.sc - a.sc);
    const filtered = scored.length ? scored.map((x) => x.e) : exploits;
    const lines = filtered.slice(0, 8).map((e) => {
      const upd = e.updateStatus ? '✅ آپدیت‌شده' : '⚠️ آپدیت‌نشده';
      const det = e.detected ? '🚨 شناسایی‌شده' : '🟢 شناسایی‌نشده';
      const cost = e.free ? 'رایگان' : 'پولی';
      return `• **${e.title}** — ${e.platform} — ${upd} — ${det} — ${cost}`;
    }).join('\n');
    return `این اکسپلویت‌ها مرتبط هستند:\n\n${lines}`;
  }

  if (low.includes('سلام') || low.length < 4) {
    const pop = scripts.slice(0, 5).map((s, i) => {
      const auth = s.profiles?.display_name || s.profiles?.username || 'ناشناس';
      return `${i + 1}. **${s.title}** — ${s.game_name || 'عمومی'} — ناشر: ${auth} ${s.is_verified ? '✅' : ''}`;
    }).join('\n');
    return `سلام! 👋 من دستیار هوشمند Roblox Script هستم — دسترسی کامل به اسکریپت‌ها، اکسپلویت‌ها و ناشران دارم.\n\n🔥 محبوب‌ترین‌ها:\n${pop}\n\nبگو دنبال چه بازی هستی!`;
  }

  const tokens = tokenize(q);
  const scored = scripts.map((s) => ({ s, sc: scoreScript(s, tokens, q) })).sort((a, b) => b.sc - a.sc);
  const relevant = scored.filter((x) => x.sc > 0).slice(0, 6).map((x) => x.s);
  const toShow = relevant.length ? relevant : scripts.slice(0, 6);

  const out = toShow.map((s, i) => {
    const pName = s.profiles?.display_name || s.profiles?.username || 'ناشناس';
    const role = s.profiles?.role === 'admin' ? '👑 مدیر سایت' : `👤 ${pName}`;
    return `${i + 1}. **${s.title}** — بازی: ${s.game_name || 'عمومی'} — ${role}${s.is_verified ? ' ✅' : ''}`;
  }).join('\n');

  return relevant.length
    ? `برای «${q}» این‌ها بیشترین تطابق را دارند:\n\n${out}`
    : `چیزی دقیق برای «${q}» پیدا نکردم، ولی این‌ها محبوب‌ترین‌های فعلی هستند:\n\n${out}`;
}
