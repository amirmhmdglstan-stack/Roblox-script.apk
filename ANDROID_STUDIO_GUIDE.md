# 📱 Roblox Script — Android Studio Build Guide

Build the **Roblox Script** website as an Android APK, step by step.

**TL;DR** — Open this folder in Android Studio → wait for sync → `Build → Build App Bundle(s)/APK(s) → Build APK(s)` → install `app/build/outputs/apk/debug/app-debug.apk` on your phone.

---

## 1. What you are building

The APK is a **real native Android app** (not a PWA, not a link to a website).
It contains a native Android shell (`MainActivity`), your launcher icon, and the
**entire application bundled inside the APK** at `app/src/main/assets/www`.
When you open the app you see the real Roblox Script platform — same
dark/electric-cyan design, same RTL Persian UI, same Supabase auth, uploads,
search, likes and favorites.

- Everything is loaded **straight from the APK file** (`file:///android_asset/...`)
  — no server, no special tricks, works on every Android device, opens even offline.
- Only **live content** needs internet, exactly like the website itself:
  scripts & users come from your Supabase database, thumbnails from Supabase
  Storage, and the Vazirmatn font from Google Fonts (falls back to the system
  font offline).

| Feature | How it works in the APK |
|---|---|
| App UI, all pages, logic | ✅ bundled inside the APK (`assets/www`) — works offline |
| Login / sign-up | Supabase email+password, same as website |
| Scripts, search, likes, favorites | Supabase database + RLS policies (already set up by you) |
| Thumbnail uploads | Supabase Storage bucket `script-thumbnails` |
| Online counters | `get_online_counts` / `heartbeat_presence` RPCs |
| Back button | goes back inside the app (browser-style) |
| External links | open in the phone's default browser |

---

## 2. Requirements

- **Android Studio** — download from <https://developer.android.com/studio>
  (any recent version: Koala, Ladybug, Meerkat, …).
- **No separate JDK needed** — Android Studio bundles one.
- **No Android SDK needed manually** — Android Studio installs it on first sync.
- A phone with **Android 7.0+ (API 24+)** or an emulator.
- Internet connection for the first build (downloads Gradle 8.9 + libraries, a few minutes).

---

## 3. Get the project

**Option A — git clone** (recommended, you get updates easily):

```bash
git clone https://github.com/amirmhmdglstan-stack/Roblox-script.apk.git
```

**Option B — ZIP:** on GitHub, green `Code ▾` button → *Download ZIP* → unzip.

---

## 4. Open in Android Studio

1. Launch Android Studio.
2. `File → Open…`
3. Select the **project root folder** (the one containing `settings.gradle.kts`
   and `gradlew` — the folder this guide is in). Click **OK**.
4. Android Studio will say the project uses Gradle 8.9 from the wrapper →
   click **Trust Project** / **OK**.
5. **Wait for the Gradle sync.** You'll see progress at the bottom.
   First sync downloads dependencies and can take **5–15 minutes**.
   When it finishes, the bottom bar shows `BUILD SUCCESSFUL` (or the sync icon stops spinning).
6. If a popup asks about missing SDK components (Android SDK Platform 34 /
   Build-Tools), click **Install** / **OK** and wait for it to finish.

> If sync fails with a JDK error: `File → Settings → Build, Execution, Deployment →
> Build Tools → Gradle → Gradle JDK` and choose **17** or **21** (embedded JDK).

---

## 5. Build the APK

### 5a. Debug APK (fastest — fine for your own phone)

- Menu: **`Build → Build App Bundle(s) / APK(s) → Build APK(s)`**
- When finished, a notification appears. The APK is at:

```
app/build/outputs/apk/debug/app-debug.apk
```

That's it — send this file to your phone and install it.

### 5b. Release APK (for sharing with others)

1. **`Build → Generate Signed App Bundle / APK…`**
2. Choose **APK** → Next.
3. **Key store path:** click *Create new…*:
   - Key store path: pick a folder, e.g. `~/keystores/roblox-script.jks`
   - Password: create a strong one and **save it somewhere safe** 🔑
   - Alias: `robloxscript` (or anything) — with its own password
   - Validity: `25` years minimum, name: your name
4. Next → choose **release** → **Finish**.
5. APK output:

```
app/build/outputs/apk/release/app-release.apk
```

> ⚠️ **Keep the `.jks` keystore and passwords forever.** Every future update must
> be signed with the same keystore, or users can't update (they'd have to uninstall first).

---

## 6. Install on your phone

**Option A — file transfer (no cable):**
1. Copy `app-debug.apk` (or `app-release.apk`) to your phone — USB, Google Drive, Telegram, email…
2. Tap the file on the phone.
3. If asked, allow **"Install unknown apps"** for the app you're using (Files/Telegram).
4. If you have the website's APK installed from a different signature, uninstall it first.

**Option B — USB debugging (developer workflow):**
1. On the phone: `Settings → About phone → tap "Build number" 7 times` →
   developer mode is enabled.
2. `Settings → Developer options → USB debugging` → ON.
3. Connect the phone with a USB cable, allow the debug prompt.
4. In Android Studio, press the green **Run ▶** button, pick your phone.
   Android Studio installs and launches the app automatically.

**Option C — emulator:** In Android Studio: *Device Manager → Create device*
(choose a recent Pixel), then press **Run ▶**.

---

## 7. How the app works (for curious people)

- `MainActivity.kt` loads the app straight from the APK file itself
  (`file:///android_asset/www/index.html`) — no server and no special network
  tricks, so it works on every Android version and opens even without internet.
- The site is built with relative asset paths and hash-based routing
  (`#/upload`, `#/script/...`), which is what makes file-based loading possible.
- JavaScript, DOM storage and sessions are enabled, so Supabase login stays
  logged in between app launches.
- The top thin cyan bar shows page-load progress.
- If you ever set `REMOTE_URL` (see below), the app loads your hosted website
  instead of the bundled copy.

---

## 8. Customizing the app

| What | Where |
|---|---|
| **App name** | `app/src/main/res/values/strings.xml` → `<string name="app_name">` |
| **App icon** | `app/src/main/res/mipmap-*` (PNGs) + `drawable/ic_launcher_foreground.xml` — or right-click `res → New → Image Asset` and draw a new one |
| **Package ID** | `app/build.gradle.kts` → `applicationId` (change this before publishing on Google Play) |
| **Colors** | `app/src/main/res/values/colors.xml` (navy `#060B14`, electric cyan `#00E5FF`) |
| **Version** | `app/build.gradle.kts` → `versionCode` / `versionName` |
| **Load a hosted URL** | `MainActivity.kt` → `REMOTE_URL` (e.g. `"https://roblox-script.onrender.com"`). Empty = bundled site. |

---

## 9. Updating the app after you change the website

The web source lives in the `web/` folder of this repo (it's the same code as
your `Roblox-Script` repo, plus the two config files that were missing —
`vite.config.ts` and `tailwind.config.js` — so it can actually build).

1. Install Node.js (<https://nodejs.org>).
2. Build the site **and** refresh the bundled app in one command:

```bash
cd web
npm install
npm run build:apk   # builds + writes the single-file app into app/src/main/assets/www/
```

3. Rebuild the APK in Android Studio (section 5).

> The APK contains the app as ONE self-contained `index.html` (CSS + JS
> inlined) so nothing can fail to load from the APK file.
> The Supabase URL + anon key are baked in at build time — they're in
> `web/.env` (copy `web/.env.example` → `.env` first; your values are in
> `env.txt` of the original Roblox-Script repo).

---

## 9.5. Bonus: build the APK automatically with GitHub Actions (no Android Studio needed)

The repo includes a ready-made CI workflow at `workflow/build-apk.yml`.
Enable it once from the GitHub website (takes 30 seconds):

1. Open your repo on GitHub → **Add file → Create new file**.
2. Name it exactly: `.github/workflows/build-apk.yml`
3. Paste the content of `workflow/build-apk.yml` → **Commit**.
4. From then on, every push **tests the app** (loads it from `file://` in
   headless Chromium — if the screen would be blank, the build fails instead
   of you finding out on your phone) and builds the APK in the cloud. Open the
   **Actions** tab → latest run → download the **Roblox-Script-APK** artifact
   (it's `app-debug.apk` inside).
5. To get a downloadable release: create a tag (`Releases → Create a new
   release → Choose a tag → v1.0`). The workflow attaches the APK to the release.

> If you already enabled the workflow earlier, update it once: open your
> `.github/workflows/build-apk.yml` on GitHub → paste the new content of
> `workflow/build-apk.yml` → commit. (Adds the automatic smoke test.)

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Gradle sync fails | Check internet. `File → Invalidate Caches… → Invalidate and Restart`. Make sure Gradle JDK is 17+ (Settings → Build Tools → Gradle). |
| "SDK location not found" | Settings → Appearance & Behavior → System Settings → Android SDK → install **Android 14 (API 34)** platform + Build-Tools, then sync again. |
| App opens but is blank/white | You're running an **old build**. Re-download the latest code (ZIP from the branch, or `git pull`), rebuild, uninstall the old app, install the new one. The current version is a single self-contained file (no ES modules, no special hosts) and loads on every device. If it ever happens again, the app now shows the actual error message in a red box at the bottom of the screen — screenshot it and share it. |
| Login fails | Your Supabase free project may be **paused** (free tier pauses after ~1 week of inactivity) — open the Supabase dashboard and *Restore project*. |
| "App not installed" | A previous install used a different signature — uninstall the old app first. |
| Persian fonts look wrong | Fonts (Vazirmatn) load from Google Fonts on first open — they need internet once, then are cached. |
| I want a smaller APK | In `app/build.gradle.kts` → `release` block, set `isMinifyEnabled = true` and build a **signed release** APK. |
| Phone is old (Android 6 or less) | Raise `minSdk` won't help — this app needs Android 7.0+ (API 24). |

---

## 11. FAQ

**Do I need the Render server for the APK?**
No. The website's frontend talks straight to Supabase, and so does the app.
The Express server is only used to host the website files.

**Do I need to change anything in Supabase?**
No. You already ran `supabase_setup.sql` in the SQL Editor — the app uses the
same anon key and RLS policies as the website.

**Is my Supabase key safe in the APK?**
It's the *public anon key* — the same one embedded in every website visitor's
browser. Supabase RLS policies protect the data, exactly as on the web.

**Can people publish this APK on Google Play?**
Technically yes (after a signed release build + changing the package ID), but
Google Play doesn't allow Roblox cheating/scripting apps — keep this for
personal use / sideloading.
