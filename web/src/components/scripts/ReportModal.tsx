import React, { useState } from 'react';
import { ReportReasonType } from '../../types';
import { supabase } from '../../lib/supabase';
import { toPersianMessage } from '../../lib/errors';
import { Portal } from '../common/Portal';
import { useAuth } from '../../context/AuthContext';
import { X, ShieldAlert, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptId: string;
  scriptTitle: string;
}

const reportReasons: { id: ReportReasonType; label: string }[] = [
  { id: 'malicious', label: 'محتوای مخرب یا مشکوک' },
  { id: 'copyright', label: 'کپی‌رایت یا سرقت محتوا' },
  { id: 'inappropriate', label: 'محتوای نامناسب' },
  { id: 'misleading', label: 'اطلاعات نادرست' },
  { id: 'other', label: 'سایر' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  scriptId,
  scriptTitle,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReasonType>('malicious');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('script_reports').insert({
        script_id: scriptId,
        reporter_id: user?.id || null,
        reason,
        details,
      });

      if (error) throw error;
      toast.success('گزارش شما با موفقیت ثبت شد و توسط مدیران بررسی خواهد شد.');
      onClose();
      setDetails('');
    } catch (err: any) {
      toast.error(toPersianMessage(err?.message, 'خطا در ثبت گزارش تخلف. دوباره تلاش کنید.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-dark-800 rounded-2xl border border-rose-500/30 p-6 shadow-glow-lg text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-500" />
            <span>گزارش تخلف اسکریپت</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          گزارش برای اسکریپت: <span className="font-bold text-slate-200">{scriptTitle}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              دلیل گزارش تخلف را انتخاب کنید:
            </label>
            <div className="space-y-2">
              {reportReasons.map((item) => (
                <label
                  key={item.id}
                  onClick={() => setReason(item.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === item.id
                      ? 'bg-rose-500/15 border-rose-500 text-rose-300'
                      : 'bg-dark-900/60 border-white/10 text-slate-300 hover:border-white/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reason === item.id}
                    onChange={() => setReason(item.id)}
                    className="accent-rose-500"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              توضیحات تکمیلی (اختیاری):
            </label>
            <textarea
              rows={3}
              placeholder="توضیحات یا لینک مدارک مربوط به تخلف را اینجا بنویسید..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-dark-900 border border-white/15 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-sm transition-all"
            >
              {loading ? 'در حال ارسال...' : 'ارسال گزارش تخلف'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
};
