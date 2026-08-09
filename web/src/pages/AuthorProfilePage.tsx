import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Script, Profile } from '../types';
import { ScriptCard } from '../components/scripts/ScriptCard';
import { User, Shield, ArrowRight, FileText } from 'lucide-react';

export const AuthorProfilePage: React.FC = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const [author, setAuthor] = useState<Profile | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAuthorData = useCallback(async () => {
    if (!authorId) return;
    setLoading(true);
    try {
      // 1. Fetch Author profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single();

      if (profileData && !profileErr) {
        setAuthor(profileData);
      }

      // 2. Fetch public scripts by this author
      const { data: scriptsData, error: scriptsErr } = await supabase
        .from('scripts')
        .select(`*, profiles:author_id (display_name, username, avatar_url)`)
        .eq('author_id', authorId)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (scriptsData && !scriptsErr) {
        const parsed = scriptsData.map((s: any) => ({
          ...s,
          author_display_name: s.profiles?.display_name,
          author_username: s.profiles?.username,
          author_avatar_url: s.profiles?.avatar_url,
        }));
        setScripts(parsed);
      }
    } catch (err) {
      console.error('Error fetching author profile:', err);
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    fetchAuthorData();
  }, [fetchAuthorData]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-32 bg-dark-800 rounded-2xl w-full mb-8" />
        <div className="h-64 bg-dark-800 rounded-2xl w-full" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">کاربر مورد نظر یافت نشد</h2>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-electric-500 text-dark-900 font-bold text-sm"
        >
          <span>بازگشت به صفحه اصلی</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به لیست اسکریپت‌ها</span>
        </Link>
      </div>

      {/* Author Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-dark-700 flex items-center justify-center font-black text-white text-2xl border border-electric-500/40 shadow-glow-sm shrink-0">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt={author.display_name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              author.display_name?.[0] || 'U'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-white">{author.display_name}</h1>
              {author.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  مدیر سایت
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-slate-400">@{author.username}</p>
            {author.bio && <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">{author.bio}</p>}
          </div>
        </div>

        <div className="bg-dark-900/80 px-4 py-2.5 rounded-2xl border border-white/10 text-center shrink-0">
          <div className="text-xs text-slate-400 mb-1">اسکریپت‌های منتشرشده</div>
          <div className="text-xl font-black font-mono text-electric-400">{scripts.length}</div>
        </div>
      </div>

      {/* Published Scripts Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
          <FileText className="w-5 h-5 text-electric-500" />
          <span>آپلودهای عمومی این کاربر</span>
        </h2>

        {scripts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {scripts.map((script) => (
              <ScriptCard key={script.id} script={script} onRefresh={fetchAuthorData} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-dark-800/40 rounded-3xl border border-dashed border-white/15 p-8 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white mb-2">هنوز اسکریپتی عمومی منتشر نشده است</h3>
            <p className="text-xs text-slate-400">
              این کاربر در حال حاضر اسکریپت عمومی در سایت ثبت نکرده است.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
