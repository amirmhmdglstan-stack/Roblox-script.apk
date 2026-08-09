// Translates common Supabase / network / API error messages (English)
// into Persian so users never see raw English notifications in the app.

const persianCharRegex = /[؀-ۿ]/;

const errorMap: Array<[RegExp, string]> = [
  // Supabase Auth
  [/invalid login credentials/i, 'ایمیل یا رمز عبور وارد شده اشتباه است.'],
  [/email not confirmed/i, 'ایمیل شما هنوز تأیید نشده است. لطفاً روی لینک تأیید ارسال‌شده به ایمیلتان کلیک کنید.'],
  [/user already registered|already been registered|already in use/i, 'این ایمیل قبلاً در سایت ثبت شده است. به‌جای ثبت‌نام وارد شوید.'],
  [/password should be at least|password.*(6|six) characters/i, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'],
  [/unable to validate email|invalid format|valid email/i, 'آدرس ایمیل وارد شده معتبر نیست.'],
  [/signup requires a valid password/i, 'رمز عبور وارد شده معتبر نیست.'],
  [/rate limit|too many requests|only request this/i, 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً کمی بعد دوباره امتحان کنید.'],
  [/token has expired|invalid.*token|jwt expired/i, 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.'],
  [/user not found/i, 'کاربری با این مشخصات یافت نشد.'],
  [/weak password/i, 'رمز عبور انتخابی ضعیف است. رمز قوی‌تری انتخاب کنید.'],

  // Supabase Storage
  [/bucket not found/i, 'فضای ذخیره‌سازی تصاویر (Bucket) در دسترس نیست. لطفاً با مدیر سایت تماس بگیرید.'],
  [/row.level security|violates.*policy|not authorized|permission denied/i, 'شما مجوز انجام این عملیات را ندارید.'],
  [/already exists|duplicate key/i, 'این مورد قبلاً ثبت شده است.'],
  [/payload too large|maximum allowed size|entity too large/i, 'حجم فایل بیش از حد مجاز است.'],
  [/mime.*not supported|unsupported.*type/i, 'فرمت فایل انتخابی پشتیبانی نمی‌شود.'],

  // Network / generic
  [/failed to fetch|network|load failed|econnrefused|timeout/i, 'خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید.'],
  [/missing.*env|supabaseUrl is required|supabaseKey is required/i, 'تنظیمات اتصال به پایگاه داده انجام نشده است. با مدیر سایت تماس بگیرید.'],
];

/**
 * Maps a raw error message to a friendly Persian message.
 * - If a known English pattern matches → mapped Persian text.
 * - If the message already contains Persian → returned as-is.
 * - Otherwise → the provided Persian fallback (never leaks English to the UI).
 */
export const toPersianMessage = (
  message: string | undefined | null,
  fallback = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'
): string => {
  if (!message) return fallback;
  for (const [pattern, persian] of errorMap) {
    if (pattern.test(message)) return persian;
  }
  if (persianCharRegex.test(message)) return message;
  return fallback;
};
