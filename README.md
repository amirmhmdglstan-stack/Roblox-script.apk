# Roblox Script — Android APK 📱

This repository contains a complete **Android Studio project** that packages
[**Roblox Script**](https://github.com/amirmhmdglstan-stack/Roblox-Script)
(a Persian RTL React + Supabase community platform for Roblox scripts)
into a native Android app (APK).

> **Built from the `arena/019fcecf-roblox-script` branch** of the original
> project (the maintained one — the `main` branch is outdated/buggy).

The app is **not a link to the website** — the full web app is bundled inside
the APK (`app/src/main/assets/www`) and rendered with a secure Android WebView,
so the UI, styling, Supabase auth, uploads, search — everything — works exactly
like the original web project, straight from your Supabase database.

The original website's Express server also proxies third-party APIs
(exploit statuses from WEAO, the AI assistant «همیار»). In this app those
`/api/*` endpoints are implemented **natively inside the Android app**
(`MainActivity.kt`), so every feature works in the APK with no server at all.

## ✅ What's inside

```
├── app/
│   ├── build.gradle.kts              # Android module config
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/robloxscript/app/MainActivity.kt   # loads the app from the APK file
│       ├── res/                       # Theme (dark navy + electric cyan), launcher icon
│       └── assets/www/                # ⬅ the entire app (UI + logic), bundled inside the APK
├── web/                               # Full source of the web app (buildable)
│   ├── src/                           # All React + TypeScript pages & components
│   ├── vite.config.ts                 # (reconstructed — missing in the original repo)
│   └── tailwind.config.js             # (reconstructed from the original design)
├── gradle/                            # Gradle wrapper (8.9)
├── settings.gradle.kts
└── ANDROID_STUDIO_GUIDE.md            # ⬅ step-by-step build guide
```

## 🚀 Quick start

1. Open this folder in **Android Studio** (`File → Open`).
2. Wait for the Gradle sync to finish.
3. `Build → Build App Bundle(s)/APK(s) → Build APK(s)`.
4. Install `app/build/outputs/apk/debug/app-debug.apk` on your phone.

Full details, customization options and troubleshooting:
➡️ **[ANDROID_STUDIO_GUIDE.md](ANDROID_STUDIO_GUIDE.md)**

## 🔄 Updating the app after changing the website

The APK contains the whole app as ONE self-contained file
(`app/src/main/assets/www/index.html`) — CSS + JS are inlined into it, so it
works when loaded straight from the APK on any Android device.

1. `cd web && npm install`
2. `npm run build:apk` — builds the site AND writes the single-file app
   directly into `app/src/main/assets/www/`
3. Rebuild the APK in Android Studio (or push — the cloud build does it).

## 🧪 Automatic testing (optional)

The repo includes a **smoke test** (`web/tests/smoke.mjs`) that loads the
bundled app from `file://` in headless Chromium and checks that it actually
renders — catching blank-screen bugs before you install anything.
Run it locally: `npm i playwright && npx playwright install chromium && node web/tests/smoke.mjs`
The CI workflow (`workflow/build-apk.yml`) runs it automatically before every
build once enabled (see the guide).

## 🤖 Optional: auto-build the APK with GitHub Actions

A ready-made CI workflow is included at [`workflow/build-apk.yml`](workflow/build-apk.yml).
To enable it: on GitHub, go to **Add file → Create new file**, type
`.github/workflows/build-apk.yml`, paste the file's contents, and commit.
Every push then builds the APK in the cloud and uploads it as an artifact
(`Actions` tab → latest run → *Roblox-Script-APK*). Pushing a tag like
`v1.0` also creates a GitHub Release with the APK attached.

## 📝 Notes

- The app talks directly to **Supabase** (same public anon key the website uses),
  so no backend server is required.
- Supabase setup (`supabase_setup.sql`) lives in the original
  [Roblox-Script](https://github.com/amirmhmdglstan-stack/Roblox-Script) repo — no changes needed here.
- Android 7.0+ (API 24) is supported. Only the `INTERNET` permission is used.
