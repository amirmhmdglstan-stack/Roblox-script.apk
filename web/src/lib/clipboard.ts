/**
 * Cross-platform clipboard helper.
 *
 * Works everywhere:
 *  1. Native Android bridge (exposed by MainActivity as window.AndroidBridge)
 *  2. Standard navigator.clipboard API (https contexts, modern browsers)
 *  3. Legacy document.execCommand('copy') fallback (file:// pages in WebViews)
 */
export const copyToClipboard = (text: string): Promise<boolean> => {
  // 1) Native Android bridge (best in the APK — no permissions needed)
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.copyToClipboard === 'function') {
      bridge.copyToClipboard(text);
      return Promise.resolve(true);
    }
  } catch (e) {
    // ignore, try next method
  }

  // 2) Standard clipboard API (secure contexts)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
    }
  } catch (e) {
    // ignore, try next method
  }

  // 3) Legacy fallback
  return Promise.resolve(fallbackCopy(text));
};

function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}
