import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toPersianMessage } from '../../lib/errors';
import { Portal } from '../common/Portal';
import { X, LogIn, UserPlus, Lock, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('لطفاً ایمیل و رمز عبور را وارد کنید');
      return;
    }
    if (password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password);
      setLoading(false);
      if (!error) {
        onClose();
      } else {
        toast.error(toPersianMessage(error?.message, 'خطا در ورود به حساب کاربری. اطلاعات ورود را بررسی کنید.'));
      }
    } else {
      if (password !== confirmPassword) {
        setLoading(false);
        toast.error('رمز عبور با تکرار آن مطابقت ندارد');
        return;
      }
      if (!displayName.trim() || !username.trim()) {
        setLoading(false);
        toast.error('نام نمایشی و نام کاربری الزامی است');
        return;
      }
      const { error } = await signUpWithEmail(email, password, displayName, username);
      setLoading(false);
      if (!error) {
        // The verification-link / welcome toast is shown by AuthContext.
        onClose();
      } else {
        toast.error(toPersianMessage(error?.message, 'خطا در ثبت‌نام. ممکن است این ایمیل قبلاً ثبت شده باشد.'));
      }
    }
  };

  return (
    <Portal>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-dark-800 rounded-2xl border border-electric-500/30 p-6 shadow-glow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg bg-dark-700/60 text-slate-400 hover:text-white transition-colors"
          title="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 pb-3 text-center font-bold text-sm border-b-2 transition-all ${
              mode === 'signin'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4 inline-block ml-1.5" />
            ورود به حساب
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 pb-3 text-center font-bold text-sm border-b-2 transition-all ${
              mode === 'signup'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block ml-1.5" />
            ساخت حساب
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  نام نمایشی (Display Name)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: امیر محمد"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-dark-900 border border-white/15 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  نام کاربری (Username)
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute right-3 top-2.5 text-sm">@</span>
                  <input
                    type="text"
                    required
                    placeholder="example_user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-dark-900 border border-white/15 rounded-xl pr-8 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500 font-mono text-left dir-ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              رمز عبور
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-white/15 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500 font-mono text-left dir-ltr"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                تکرار رمز عبور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-900 border border-white/15 rounded-xl pr-10 pl-3 py-2.5 text-sm text-white focus:outline-none focus:border-electric-500 font-mono text-left dir-ltr"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-electric-600 to-electric-500 hover:from-electric-500 hover:to-electric-400 text-dark-900 font-bold text-sm shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-50"
            >
              {loading ? 'در حال پردازش...' : mode === 'signin' ? 'ورود' : 'ساخت حساب'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            {mode === 'signin' ? 'حساب کاربری ندارید؟' : 'قبلاً حساب ساخته‌اید؟'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-electric-400 hover:text-electric-300 font-bold underline"
            >
              {mode === 'signin' ? 'ثبت‌نام کنید' : 'وارد شوید'}
            </button>
          </p>
        </div>
      </div>
    </div>
    </Portal>
  );
};
