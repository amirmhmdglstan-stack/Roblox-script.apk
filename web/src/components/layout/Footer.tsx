import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { seedSampleScripts } from '../../lib/supabase';
import { ShieldAlert, Terminal, Sparkles, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemoData = async () => {
    if (!user) {
      toast.error('برای ایجاد داده‌های نمونه ابتدا وارد حساب کاربری خود شوید.');
      return;
    }
    setSeeding(true);
    const toastId = toast.loading('در حال افزودن اسکریپت‌های نمونه به پایگاه داده...');
    const success = await seedSampleScripts(user.id);
    toast.dismiss(toastId);
    setSeeding(false);

    if (success) {
      toast.success('اسکریپت‌های نمونه با موفقیت در Supabase بارگذاری شدند!');
      setTimeout(() => window.location.reload(), 1200);
    } else {
      toast.error('خطا در بارگذاری داده‌های نمونه.');
    }
  };

  return (
    <footer className="mt-20 border-t border-electric-500/15 bg-dark-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Col */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-6 h-6 text-electric-500" />
              <span className="text-xl font-black tracking-tight text-white">Roblox Script</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              پلتفرم جامعه فارسی برای کشف، اشتراک‌گذاری، جستجو و مدیریت پیشرفته اسکریپت‌های روبلاکس. طراحی شده برای توسعه‌دهندگان و کاربران حرفه‌ای.
            </p>
          </div>

          {/* Quick Links / Community */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">دسترسی سریع</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/" className="hover:text-electric-400 transition-colors">
                  صفحه اصلی و جستجوی اسکریپت
                </Link>
              </li>
              <li>
                <Link to="/upload" className="hover:text-electric-400 transition-colors">
                  آپلود و انتشار اسکریپت جدید
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-electric-400 transition-colors">
                  مدیریت اسکریپت‌های من و علاقه‌مندی‌ها
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety Disclaimer Required by spec */}
          <div className="bg-dark-800/60 p-4 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>سلب مسئولیت و امنیت</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              کاربران شخصاً مسئول محتوای آپلود شده خود هستند. توصیه می‌شود تمام اسکریپت‌ها را قبل از اجرا در محیط بازی بررسی کرده و از منابع معتبر استفاده کنید.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span>توسعه‌یافته با</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
            <span>برای جامعه اسکریپت‌نویسان فارسی</span>
          </div>

          {/* Developer Quick-Seed Demo Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800 border border-electric-500/30 hover:border-electric-500 text-electric-400 hover:text-electric-300 transition-all text-xs font-medium"
              title="برای تست امکانات سایت در پایگاه داده خالی"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{seeding ? 'در حال افزودن...' : 'تزریق اسکریپت‌های نمونه آزمایشی'}</span>
            </button>
            <span>© ۲۰۲۶ Roblox Script. تمامی حقوق محفوظ است.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
