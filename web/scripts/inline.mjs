#!/usr/bin/env node
/**
 * Single-file app builder for the Android APK.
 *
 * Takes the Vite production build (dist/) and merges everything into ONE
 * self-contained index.html: CSS and JS are inlined directly into the file,
 * so loading the app from file:///android_asset/www/index.html cannot fail
 * due to missing files, CORS or ES-module restrictions.
 *
 * Also injects:
 *  - an on-screen error reporter (so a blank screen can never happen silently
 *    again — if anything goes wrong, the phone shows the error message)
 *  - non-blocking loading of the Google Fonts stylesheet
 *
 * Writes the result to  ../app/src/main/assets/www/index.html  (relative to web/)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(webRoot, 'dist');
const outDir = resolve(webRoot, '..', 'app', 'src', 'main', 'assets', 'www');
const outFile = resolve(outDir, 'index.html');

if (!existsSync(resolve(dist, 'index.html'))) {
  console.error('❌ dist/index.html not found — run `npm run build` first.');
  process.exit(1);
}

let html = readFileSync(resolve(dist, 'index.html'), 'utf8');

// ── Inline all local stylesheets ─────────────────────────────────────────────
html = html.replace(
  /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
  (_m, href) => {
    const file = resolve(dist, href.replace(/^\.\//, ''));
    const css = readFileSync(file, 'utf8').replace(/<\/style/gi, '<\\/style');
    return `<style>\n${css}\n</style>`;
  }
);

// ── Inline all local scripts (classic or module — both become classic) ──────
// IMPORTANT: the app script must run AFTER <div id="root"> exists. Classic
// scripts execute synchronously, so if we leave the script in <head> (where
// Vite puts it as a deferred module), React's createRoot(document.getElementById
// ('root')) finds nothing and the app crashes with a blank screen. We therefore
// capture the app script here and re-insert it at the very end of <body>.
let appScript = '';
html = html.replace(
  /<script[^>]*src="([^"]+)"[^>]*><\/script>/g,
  (_m, src) => {
    const file = resolve(dist, src.replace(/^\.\//, ''));
    let js = readFileSync(file, 'utf8');
    js = js.replace(/<\/script/gi, '<\\/script');
    appScript = `<script>\n${js}\n</script>`;
    return ''; // removed from <head>; re-added before </body> below
  }
);

// ── Google Fonts: non-blocking ───────────────────────────────────────────────
html = html.replace(
  /<link([^>]*)href="(https:\/\/fonts\.googleapis\.com[^"]+)"([^>]*)>/g,
  (_m, a, href) =>
    `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet" href="${href}"></noscript>`
);

// ── Error reporter + startup watchdog (shows the problem instead of a blank screen) ──
const errorOverlay = `<script>
(function () {
  function errBox(msg) {
    try {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;background:#1c0f0f;color:#ffb4b4;border:1px solid #ff5252;border-radius:12px;padding:12px 14px;font:13px/1.7 Vazirmatn,Segoe UI,Tahoma,sans-serif;direction:rtl;text-align:right;box-shadow:0 4px 24px rgba(0,0,0,.5);max-height:45%;overflow:auto;white-space:pre-wrap';
      d.textContent = '⚠ ' + msg + ' (برای بستن روی پیام بزنید)';
      d.onclick = function () { d.parentNode && d.parentNode.removeChild(d); };
      document.body.appendChild(d);
    } catch (e) {}
  }
  window.addEventListener('error', function (e) {
    errBox('خطای برنامه: ' + (e.message || 'خطای ناشناخته') + (e.filename ? ' (' + e.filename.split('/').pop() + ')' : ''));
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    errBox('خطای ناهمگام: ' + (r && r.message ? r.message : String(r)));
  });
  setTimeout(function () {
    try {
      var root = document.getElementById('root');
      if (!root || root.childElementCount === 0) {
        errBox('محتوای برنامه بارگذاری نشد (صفحه سفید). لطفاً از این پیام اسکرین‌شات بگیرید.');
      }
    } catch (e) {}
  }, 8000);
})();
</script>`;

// Inject the error reporter as the very first thing in <head>, so it catches
// errors from the app script that follows.
html = html.replace('<head>', '<head>' + errorOverlay);

// ── The app script goes at the very end of <body>, after <div id="root"> ──
if (appScript) {
  html = html.replace('</body>', appScript + '</body>');
}

// ── Write the single file (and clean the folder — only index.html is needed) ──
mkdirSync(outDir, { recursive: true });
for (const f of readdirSafe(outDir)) {
  rmSync(resolve(outDir, f), { recursive: true, force: true });
}
writeFileSync(outFile, html);
console.log(`✅ Single-file app written to ${outFile} (${(html.length / 1024).toFixed(0)} KB)`);

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
