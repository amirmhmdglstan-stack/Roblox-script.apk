import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, uploadThumbnail } from '../lib/supabase';
import {
  Upload,
  Image as ImageIcon,
  X,
  Plus,
  Terminal,
  AlertCircle,
  HelpCircle,
  Globe,
  Link as LinkIcon,
  Lock,
  Gamepad2,
  FileText,
  Key
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UploadPage: React.FC<{ onOpenAuthModal: () => void }> = ({ onOpenAuthModal }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect unauthenticated visitors to sign-in modal/page
  useEffect(() => {
    if (!user) {
      toast.error('برای آپلود اسکریپت ابتدا وارد حساب کاربری خود شوید.');
      onOpenAuthModal();
    }
  }, [user, onOpenAuthModal]);

  // Form fields
  const [title, setTitle] = useState('');
  const [gameId, setGameId] = useState('');
  const [gameName, setGameName] = useState('');
  const [isHubOrUniversal, setIsHubOrUniversal] = useState<boolean>(false);
  const [supportedGamesStr, setSupportedGamesStr] = useState('');
  const [features, setFeatures] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Roblox', 'Script']);
  const [scriptContent, setScriptContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [keyRequirement, setKeyRequirement] = useState<'keyless' | 'key_required' | 'unknown'>('unknown');
  
  // Image handling
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Validate unsafe file types
  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('فرمت فایل نامعتبر است. لطفاً فایل تصویری (JPG, PNG, WEBP) انتخاب کنید.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم تصویر نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }

    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('فایل رها شده نامعتبر است. لطفاً فایل تصویری انتخاب کنید.');
      return;
    }
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setThumbnailPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      toast.error('حداکثر ۵۰ کاراکتر برای هر تگ مجاز است.');
      return;
    }
    if (tags.includes(trimmed)) {
      toast.error('این تگ قبلاً اضافه شده است.');
      return;
    }
    if (tags.length >= 10) {
      toast.error('حداکثر ۱۰ تگ می‌توانید اضافه کنید.');
      return;
    }
    setTags([...tags, trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleFormSubmit = async (e: React.FormEvent, status: 'published' | 'draft' = 'published') => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    // Validation
    if (!title.trim()) {
      toast.error('عنوان اسکریپت الزامی است.');
      return;
    }
    if (title.length > 60) {
      toast.error('عنوان اسکریپت نباید بیشتر از ۶۰ کاراکتر باشد.');
      return;
    }

    // If game name is blank, Hub / universal selection becomes required
    if (!gameName.trim() && !isHubOrUniversal) {
      toast.error('در صورتی که نام بازی را خالی می‌گذارید، باید گزینه هاب یا اسکریپت عمومی را فعال کنید.');
      return;
    }

    if (!scriptContent.trim()) {
      toast.error('متن کد اسکریپت الزامی است.');
      return;
    }

    status === 'draft' ? setIsDrafting(true) : setSubmitting(true);
    const toastId = toast.loading(status === 'draft' ? 'در حال ذخیره پیش‌نویس...' : 'در حال انتشار اسکریپت...');

    try {
      let uploadedThumbnailUrl: string | undefined = undefined;
      if (thumbnailFile) {
        uploadedThumbnailUrl = await uploadThumbnail(thumbnailFile);
      }

      // Parse supported games separated by dash (-) max 15 games
      const supportedGamesList = supportedGamesStr
        .split('-')
        .map((g) => g.trim())
        .filter((g) => g.length > 0)
        .slice(0, 15);

      const uniqueSlug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-') +
        '-' +
        Math.random().toString(36).substring(2, 8);

      const newScriptData = {
        author_id: user.id,
        title: title.trim(),
        game_id: gameId.trim() || null,
        game_name: isHubOrUniversal ? (gameName.trim() || 'هاب عمومی') : gameName.trim(),
        is_hub_or_universal: isHubOrUniversal,
        script_type: 'free',
        supported_games: supportedGamesList.length > 0 ? supportedGamesList : [gameName.trim() || 'Roblox'],
        features: features.trim() || null,
        tags: tags.length > 0 ? tags : ['Roblox', 'Script'],
        script_content: scriptContent,
        commit_message: commitMessage.trim() || null,
        visibility,
        key_requirement: keyRequirement,
        is_patched: false,
        is_verified: profile?.role === 'admin' || profile?.role === 'moderator', // auto-verify if author is admin
        thumbnail_url: uploadedThumbnailUrl || null,
        slug: uniqueSlug,
        status,
        view_count: 0,
        like_count: 0,
        dislike_count: 0,
        favorite_count: 0,
      };

      const { data, error } = await supabase
        .from('scripts')
        .insert(newScriptData)
        .select()
        .single();

      if (error) throw error;

      toast.dismiss(toastId);
      toast.success(
        status === 'draft'
          ? 'پیش‌نویس اسکریپت با موفقیت ذخیره شد!'
          : 'اسکریپت شما با موفقیت در سایت منتشر شد!'
      );

      // Success redirect to created script page
      navigate(`/script/${data.slug || data.id}`);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('خطا در آپلود اسکریپت: ' + (err.message || ''));
      console.error(err);
    } finally {
      setSubmitting(false);
      setIsDrafting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Title Header */}
      <div className="mb-8 border-b border-white/10 pb-5">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Upload className="w-8 h-8 text-electric-500" />
          <span>آپلود اسکریپت</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          اسکریپت خود را با جامعه توسعه‌دهندگان فارسی روبلاکس به اشتراک بگذارید.
        </p>
      </div>

      <form onSubmit={(e) => handleFormSubmit(e, 'published')} className="space-y-8">
        {/* Card 1: Basic Info */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-electric-400 flex items-center gap-2 border-b border-white/10 pb-3">
            <FileText className="w-5 h-5" />
            <span>اطلاعات اولیه و عنوان</span>
          </h2>

          {/* Script Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-white">
                عنوان اسکریپت
              </label>
              <span className={`text-xs font-mono ${title.length > 60 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                {title.length}/60
              </span>
            </div>
            <p className="text-xs text-amber-400/90 mb-2">
              نام بازی را در عنوان ننویسید. (مثال صحیح: Auto Farm & ESP Hub)
            </p>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="مثال: Ultimate Level Farm & Fruit Collector"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>

          {/* Hub / Universal Selection */}
          <div className="p-4 rounded-xl bg-dark-900/60 border border-white/10">
            <label className="block text-sm font-bold text-white mb-2">
              آیا این یک اسکریپت هاب یا عمومی است؟
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setIsHubOrUniversal(true)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isHubOrUniversal
                    ? 'bg-electric-500/15 border-electric-500 text-electric-300'
                    : 'bg-dark-800 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <input
                  type="radio"
                  name="hubType"
                  checked={isHubOrUniversal}
                  onChange={() => setIsHubOrUniversal(true)}
                  className="accent-electric-500"
                />
                <div>
                  <div className="font-bold text-sm">هاب / اسکریپت عمومی</div>
                  <div className="text-xs text-slate-400">روی چندین بازی مختلف کار می‌کند</div>
                </div>
              </label>

              <label
                onClick={() => setIsHubOrUniversal(false)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  !isHubOrUniversal
                    ? 'bg-electric-500/15 border-electric-500 text-electric-300'
                    : 'bg-dark-800 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <input
                  type="radio"
                  name="hubType"
                  checked={!isHubOrUniversal}
                  onChange={() => setIsHubOrUniversal(false)}
                  className="accent-electric-500"
                />
                <div>
                  <div className="font-bold text-sm">اسکریپت مخصوص یک بازی</div>
                  <div className="text-xs text-slate-400">فقط برای بازی مشخص‌شده کار می‌کند</div>
                </div>
              </label>
            </div>
          </div>

          {/* Game ID & Game Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-white mb-1">
                نام بازی
              </label>
              <p className="text-xs text-slate-400 mb-2">
                اگر اسکریپت هاب یا عمومی است، این بخش را خالی بگذارید.
              </p>
              <input
                type="text"
                required={!isHubOrUniversal}
                placeholder="مثال: Blox Fruits"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-1">
                آیدی بازی (اختیاری)
              </label>
              <p className="text-xs text-slate-400 mb-2">
                شناسه عددی بازی در آدرس روبلاکس (مثال: 2753915549)
              </p>
              <input
                type="text"
                placeholder="2753915549"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>
          </div>

          {/* Supported games */}
          <div>
            <label className="block text-sm font-bold text-white mb-1">
              بازی‌های پشتیبانی‌شده (اختیاری)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              بازی‌ها را با خط تیره (-) جدا کنید. (حداکثر ۱۵ بازی)
            </p>
            <input
              type="text"
              placeholder="مثال: Blox Fruits - King Legacy - Arsenal - BedWars"
              value={supportedGamesStr}
              onChange={(e) => setSupportedGamesStr(e.target.value)}
              className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>
        </div>

        {/* Card 2: Custom Thumbnail */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-electric-400 flex items-center gap-2 border-b border-white/10 pb-3">
            <ImageIcon className="w-5 h-5" />
            <span>آپلود تصویر بندانگشتی</span>
          </h2>

          <p className="text-xs text-slate-300">
            نسبت تصویر پیشنهادی: 16:9. در صورت آپلود نکردن، تصویر پیش‌فرض مدرن برای اسکریپت شما نمایش داده می‌شود.
          </p>

          {!thumbnailPreview ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-white/20 hover:border-electric-500/60 rounded-2xl p-8 text-center bg-dark-900/60 transition-all cursor-pointer group"
              onClick={() => document.getElementById('thumbnailInput')?.click()}
            >
              <input
                id="thumbnailInput"
                type="file"
                accept="image/*"
                onChange={handleThumbnailSelect}
                className="hidden"
              />
              <div className="inline-flex p-4 rounded-2xl bg-dark-800 text-slate-400 group-hover:text-electric-400 mb-3 transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-white mb-1">
                انتخاب تصویر یا کشیدن و رها کردن فایل در اینجا
              </p>
              <p className="text-xs text-slate-400 font-mono">
                PNG, JPG, WEBP — حداکثر ۵ مگابایت (16:9)
              </p>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-electric-500/40 aspect-video max-w-md mx-auto bg-dark-900">
              <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setThumbnailFile(null);
                  setThumbnailPreview(null);
                }}
                className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-rose-500/90 text-white font-bold text-xs hover:bg-rose-600 transition-colors shadow-lg flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>حذف تصویر</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 3: Features & Tags */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-electric-400 flex items-center gap-2 border-b border-white/10 pb-3">
            <Gamepad2 className="w-5 h-5" />
            <span>ویژگی‌ها و تگ‌ها</span>
          </h2>

          {/* Features textarea */}
          <div>
            <label className="block text-sm font-bold text-white mb-1">
              ویژگی‌ها
            </label>
            <p className="text-xs text-slate-400 mb-2">
              قابلیت‌ها و امکانات کلیدی اسکریپت خود را شرح دهید:
            </p>
            <textarea
              rows={4}
              placeholder="مثال: اتوفارم لول خودکار، سرعت بالا، ای‌اس‌پی (ESP) دشمنان، بدون لگ و شناسایی..."
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="w-full bg-dark-900 border border-white/15 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-white mb-1">
              افزودن تگ
            </label>
            <p className="text-xs text-slate-400 mb-2">
              حداکثر ۵۰ کاراکتر برای هر تگ (با Enter یا دکمه افزودن)
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                placeholder="تگ جدید را بنویسید (مثال: AutoFarm, Aimbot, ESP)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-dark-900 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-white font-bold text-sm transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن</span>
              </button>
            </div>

            {/* Tag Chips */}
            <div className="flex flex-wrap gap-2">
              {tags.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/30 text-electric-400 text-xs font-mono"
                >
                  <span>#{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(item)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 4: Script Content & Commit */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-electric-400 flex items-center gap-2 border-b border-white/10 pb-3">
            <Terminal className="w-5 h-5" />
            <span>اسکریپت و کد سورس</span>
          </h2>

          {/* Key Requirement */}
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              وضعیت نیاز به کلید (Key System)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setKeyRequirement('keyless')}
                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                  keyRequirement === 'keyless'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-dark-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                بدون کلید (Keyless)
              </button>

              <button
                type="button"
                onClick={() => setKeyRequirement('key_required')}
                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                  keyRequirement === 'key_required'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-dark-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                نیازمند کلید (Key Required)
              </button>

              <button
                type="button"
                onClick={() => setKeyRequirement('unknown')}
                className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                  keyRequirement === 'unknown'
                    ? 'bg-slate-500/20 border-slate-500 text-slate-300'
                    : 'bg-dark-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                نامشخص
              </button>
            </div>
          </div>

          {/* Script Editor Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-bold text-white">
                اسکریپت (کد Lua)
              </label>
              <span className="text-xs text-slate-400">حداکثر ۱۰۰,۰۰۰ کاراکتر</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              کد اسکریپت یا دستور loadstring را در اینجا قرار دهید. قالب‌بندی و فاصله‌ها حفظ خواهد شد:
            </p>
            <textarea
              required
              rows={12}
              maxLength={100000}
              placeholder='loadstring(game:HttpGet("https://raw.githubusercontent.com/..."))()'
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="w-full bg-dark-950 border border-white/15 rounded-xl p-4 text-xs sm:text-sm font-mono text-electric-300 focus:outline-none focus:border-electric-500 transition-colors leading-relaxed dir-ltr text-left selection:bg-electric-500 selection:text-dark-950"
            />
          </div>

          {/* Commit message */}
          <div>
            <label className="block text-sm font-bold text-white mb-1">
              پیام ثبت تغییرات (اختیاری)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              اگر تغییری در نسخه اسکریپت داده‌اید یادداشت کنید (مثال: افزودن قابلیت‌های جدید اتوفارم)
            </p>
            <input
              type="text"
              placeholder="مثال: انتشار نسخه اولیه ۱.۰"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>
        </div>

        {/* Card 5: Visibility Section Required by Spec */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-electric-400 flex items-center gap-2 border-b border-white/10 pb-3">
            <Lock className="w-5 h-5" />
            <span>سطح دسترسی و نمایش اسکریپت</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Public */}
            <label
              onClick={() => setVisibility('public')}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === 'public'
                  ? 'bg-electric-500/15 border-electric-500 text-white shadow-glow-sm'
                  : 'bg-dark-900/60 border-white/10 text-slate-300 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">عمومی 🌐</span>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="accent-electric-500"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                اسکریپت شما در جستجوی سایت و موتورهای جستجو نمایش داده می‌شود.
              </p>
            </label>

            {/* Unlisted */}
            <label
              onClick={() => setVisibility('unlisted')}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === 'unlisted'
                  ? 'bg-electric-500/15 border-electric-500 text-white shadow-glow-sm'
                  : 'bg-dark-900/60 border-white/10 text-slate-300 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">فقط با لینک 🔗</span>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'unlisted'}
                  onChange={() => setVisibility('unlisted')}
                  className="accent-electric-500"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                اسکریپت شما فقط با داشتن لینک قابل دسترسی است.
              </p>
            </label>

            {/* Private */}
            <label
              onClick={() => setVisibility('private')}
              className={`flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === 'private'
                  ? 'bg-electric-500/15 border-electric-500 text-white shadow-glow-sm'
                  : 'bg-dark-900/60 border-white/10 text-slate-300 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">خصوصی 🔒</span>
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="accent-electric-500"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                هیچ‌کس به‌جز شما، حتی با داشتن لینک، به اسکریپت دسترسی ندارد.
              </p>
            </label>
          </div>
        </div>

        {/* Submit / Draft Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
          <button
            type="button"
            disabled={submitting || isDrafting}
            onClick={(e) => handleFormSubmit(e as any, 'draft')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-200 font-bold text-sm transition-colors disabled:opacity-50"
          >
            {isDrafting ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}
          </button>

          <button
            type="submit"
            disabled={submitting || isDrafting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-black text-sm shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-50"
          >
            {submitting ? 'در حال انتشار اسکریپت...' : 'انتشار اسکریپت'}
          </button>
        </div>
      </form>
    </div>
  );
};
