import React, { useEffect, useState } from 'react';
import { ScriptFilterState } from '../../types';
import { X, SlidersHorizontal, Lock, Check, RotateCcw, Filter } from 'lucide-react';
import { Portal } from '../common/Portal';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ScriptFilterState;
  onApply: (newFilters: ScriptFilterState) => void;
  onReset: () => void;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}) => {
  const [localFilters, setLocalFilters] = useState<ScriptFilterState>({ ...filters });

  // Re-sync the local form state with the real filters every time the modal opens,
  // so it never shows stale values from a previous visit.
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({ ...filters });
    }
  }, [isOpen, filters]);

  if (!isOpen) return null;

  const handleCheckboxChange = (field: keyof ScriptFilterState, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleKeyReqToggle = (reqType: 'key_required' | 'keyless') => {
    setLocalFilters((prev) => ({
      ...prev,
      keyRequirement: prev.keyRequirement === reqType ? '' : reqType,
    }));
  };

  const handleSave = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 backdrop-blur-md p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-dark-800 rounded-2xl border border-electric-500/30 p-6 shadow-glow-lg text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-electric-500" />
              <span>تنظیمات جستجوی پیشرفته</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              از این تنظیمات استفاده کنید تا نتیجه خودتان را شخصی‌سازی کنید و راحت‌تر به اسکریپت دلخواهتان برسید.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-dark-700/60 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Section 1: Filters (فیلترها) */}
          <div>
            <h3 className="text-sm font-bold text-electric-400 mb-3 flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              <span>فیلترها</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Verified Switch */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-900/70 border border-white/10 cursor-pointer hover:border-electric-500/40 transition-colors">
                <span className="text-sm text-slate-200">تأیید شده</span>
                <input
                  type="checkbox"
                  checked={localFilters.verifiedOnly}
                  onChange={(e) => handleCheckboxChange('verifiedOnly', e.target.checked)}
                  className="w-4 h-4 accent-electric-500 rounded cursor-pointer"
                />
              </label>

              {/* Universal / All games Switch */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-900/70 border border-white/10 cursor-pointer hover:border-electric-500/40 transition-colors">
                <span className="text-sm text-slate-200">برای همه بازی‌ها</span>
                <input
                  type="checkbox"
                  checked={localFilters.allGames}
                  onChange={(e) => handleCheckboxChange('allGames', e.target.checked)}
                  className="w-4 h-4 accent-electric-500 rounded cursor-pointer"
                />
              </label>

              {/* Patched Switch */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-dark-900/70 border border-white/10 cursor-pointer hover:border-electric-500/40 transition-colors">
                <span className="text-sm text-slate-200">پچ شده</span>
                <input
                  type="checkbox"
                  checked={localFilters.patchedOnly}
                  onChange={(e) => handleCheckboxChange('patchedOnly', e.target.checked)}
                  className="w-4 h-4 accent-electric-500 rounded cursor-pointer"
                />
              </label>

              {/* Key requirement switches */}
              <label
                onClick={() => handleKeyReqToggle('key_required')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  localFilters.keyRequirement === 'key_required'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-dark-900/70 border-white/10 text-slate-200 hover:border-white/30'
                }`}
              >
                <span className="text-sm">نیاز به کلید</span>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    localFilters.keyRequirement === 'key_required'
                      ? 'bg-amber-500 border-amber-500 text-dark-900'
                      : 'border-slate-500'
                  }`}
                >
                  {localFilters.keyRequirement === 'key_required' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </label>

              <label
                onClick={() => handleKeyReqToggle('keyless')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  localFilters.keyRequirement === 'keyless'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-dark-900/70 border-white/10 text-slate-200 hover:border-white/30'
                }`}
              >
                <span className="text-sm">بدون نیاز به کلید</span>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    localFilters.keyRequirement === 'keyless'
                      ? 'bg-emerald-500 border-emerald-500 text-dark-900'
                      : 'border-slate-500'
                  }`}
                >
                  {localFilters.keyRequirement === 'keyless' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Script Type (نوع اسکریپت) */}
          <div>
            <label className="block text-sm font-bold text-electric-400 mb-2">
              نوع اسکریپت
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocalFilters((prev) => ({ ...prev, scriptType: 'free' }))}
                className={`flex items-center justify-between p-3.5 rounded-xl border font-bold text-sm transition-all ${
                  localFilters.scriptType === 'free' || !localFilters.scriptType
                    ? 'bg-electric-500/20 border-electric-500 text-white'
                    : 'bg-dark-900/70 border-white/10 text-slate-400'
                }`}
              >
                <span>رایگان</span>
                <span className="text-xs text-electric-400">فعال</span>
              </button>

              {/* Paid - locked and disabled with coming soon indicator */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-900/40 border border-white/5 text-slate-500 cursor-not-allowed">
                <span className="font-medium text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>پولی</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  به‌زودی
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Game search (بازی) */}
          <div>
            <label className="block text-sm font-bold text-electric-400 mb-2">
              بازی
            </label>
            <input
              type="text"
              placeholder="با اسم یا آیدی بازی جستجو کنید"
              value={localFilters.gameQuery}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, gameQuery: e.target.value }))}
              className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>

          {/* Section 4: Sorting section (مرتب‌سازی) */}
          <div>
            <h3 className="text-sm font-bold text-electric-400 mb-3">
              مرتب‌سازی
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <select
                  value={localFilters.sortBy}
                  onChange={(e) => setLocalFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                  className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
                >
                  <option value="" disabled>مرتب‌سازی نتایج بر اساس...</option>
                  <option value="created_at">تاریخ ساخته شدن</option>
                  <option value="updated_at">تاریخ به‌روزرسانی</option>
                  <option value="view_count">بازدیدها</option>
                  <option value="like_count">لایک‌ها</option>
                  <option value="dislike_count">دیسلایک‌ها</option>
                  <option value="similarity">شباهت به جستجو</option>
                </select>
              </div>

              <div>
                <select
                  value={localFilters.sortOrder}
                  onChange={(e) => setLocalFilters((prev) => ({ ...prev, sortOrder: e.target.value as any }))}
                  className="w-full bg-dark-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-electric-500 transition-colors"
                >
                  <option value="" disabled>ترتیب مرتب‌سازی</option>
                  <option value="new">جدید (نزولی)</option>
                  <option value="old">قدیمی (صعودی)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Buttons Required by Spec */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all"
            >
              ذخیره تغییرات
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white font-medium text-sm transition-colors"
            >
              بستن
            </button>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-dark-900/60 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ریست کردن همه</span>
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
};
