package com.robloxscript.app

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

/**
 * Roblox Script — Android app.
 *
 * The WHOLE application is bundled INSIDE the APK as a single self-contained
 * file (`app/src/main/assets/www/index.html`) and loaded straight from the APK
 * file via file:///android_asset/www/index.html — it opens even offline.
 *
 * The website normally runs on a Node/Express server which also proxies some
 * third-party APIs. In this app those endpoints are implemented natively:
 *   /api/exploits, /api/versions/current, /api/sunc  -> WEAO exploit-status API
 *   /api/ai/chat                                      -> free AI (pollinations.ai)
 * so every feature works inside the APK with no server at all.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val LOCAL_INDEX = "file:///android_asset/www/index.html"
        private const val REMOTE_URL = "" // optional hosted website URL

        // WEAO API — the frontend is not allowed to set the WEAO-3PService
        // User-Agent header, so the app does it here (same as server.js).
        private val WEAO_DOMAINS = listOf(
            "https://weao.xyz",
            "https://whatexpsare.online",
            "https://whatexploitsaretra.sh",
            "https://weao.gg",
        )
        private const val WEAO_CACHE_TTL_MS = 120_000L
        private const val AI_URL = "https://gen.pollinations.ai/v1/chat/completions"
        private const val AI_MODEL = "openai-large"
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    private val weaoCache = HashMap<String, Pair<Long, ByteArray>>()
    private var weaoLastGoodBase: String? = null

    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val results = if (result.resultCode == RESULT_OK && result.data != null) {
                arrayOf(result.data!!.data!!)
            } else null
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }

    /** Exposed to the app as window.AndroidBridge.copyToClipboard(text). */
    inner class AndroidBridge {
        @JavascriptInterface
        fun copyToClipboard(text: String) {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Roblox Script", text))
            runOnUiThread {
                Toast.makeText(this@MainActivity, "کپی شد", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            // The bundled app runs from file:// and talks to Supabase over https:
            // these flags make sure nothing is blocked by file-origin/CORS rules.
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            setSupportZoom(false)
            mediaPlaybackRequiresUserGesture = false
            userAgentString = userAgentString.replace("; wv", "")
        }

        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val url: Uri = request.url

                // Serve the bundled app files straight from the APK
                if (url.scheme == "file" && url.path?.startsWith("/android_asset/") == true) {
                    return try {
                        val mime = guessMimeType(url.path!!)
                        val stream = assets.open(url.path!!.removePrefix("/android_asset/"))
                        WebResourceResponse(mime, "utf-8", stream)
                    } catch (e: IOException) {
                        null
                    }
                }

                // Serve the app's /api/* endpoints natively (no server needed)
                if (url.scheme == "file" && url.path?.startsWith("/api/") == true) {
                    return handleApi(url, request)
                }

                return null // everything else: default WebView loading
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url: Uri = request.url
                if (url.scheme == "file" || url.scheme == "about") return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view?.title?.isNotBlank() == true) title = view.title
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame && request.url.scheme == "file") {
                    view.loadUrl(LOCAL_INDEX)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }

            override fun onJsConfirm(
                view: WebView?,
                url: String?,
                message: String?,
                result: android.webkit.JsResult
            ): Boolean {
                AlertDialog.Builder(this@MainActivity)
                    .setMessage(message ?: "")
                    .setPositiveButton("بله") { _, _ -> result.confirm() }
                    .setNegativeButton("خیر") { _, _ -> result.cancel() }
                    .setOnCancelListener { result.cancel() }
                    .show()
                return true
            }

            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: android.webkit.JsResult
            ): Boolean {
                Toast.makeText(this@MainActivity, message ?: "", Toast.LENGTH_LONG).show()
                result.confirm()
                return true
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply { type = "*/*" }
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    false
                }
            }
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(if (REMOTE_URL.isNotBlank()) REMOTE_URL else LOCAL_INDEX)
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // In-app API endpoints (mirrors server.js)
    // ──────────────────────────────────────────────────────────────────────────

    private fun handleApi(url: Uri, request: WebResourceRequest): WebResourceResponse {
        val path = url.path ?: return jsonResponse(404, """{"error":"not_found"}""")
        return when {
            path == "/api/exploits" -> proxyWeao("/api/status/exploits")
            path == "/api/versions/current" -> proxyWeao("/api/versions/current")
            path == "/api/sunc" -> {
                val scrap = url.getQueryParameter("scrap") ?: ""
                val key = url.getQueryParameter("key") ?: ""
                if (scrap.isEmpty() || key.isEmpty()) jsonResponse(400, """{"error":"missing_params"}""")
                else proxyWeao("/api/sunc?scrap=${Uri.encode(scrap)}&key=${Uri.encode(key)}")
            }
            path == "/api/ai/chat" && request.method.equals("POST", true) -> handleAiChat(request)
            else -> jsonResponse(404, """{"error":"not_found"}""")
        }
    }

    private fun proxyWeao(upstreamPath: String): WebResourceResponse {
        synchronized(weaoCache) {
            val cached = weaoCache[upstreamPath]
            if (cached != null && System.currentTimeMillis() - cached.first < WEAO_CACHE_TTL_MS) {
                return jsonResponse(200, String(cached.second, StandardCharsets.UTF_8))
            }
        }

        val ordered = weaoLastGoodBase?.let { base ->
            listOf(base) + WEAO_DOMAINS.filter { it != base }
        } ?: WEAO_DOMAINS

        for (base in ordered) {
            try {
                val conn = URL(base + upstreamPath).openConnection() as HttpURLConnection
                try {
                    conn.requestMethod = "GET"
                    conn.setRequestProperty("User-Agent", "WEAO-3PService")
                    conn.setRequestProperty("Accept", "application/json")
                    conn.connectTimeout = 10_000
                    conn.readTimeout = 10_000
                    if (conn.responseCode == 429) return jsonResponse(429, """{"error":"rate_limited"}""")
                    if (conn.responseCode !in 200..299) continue
                    val body = readAll(conn.inputStream)
                    synchronized(weaoCache) {
                        weaoLastGoodBase = base
                        weaoCache[upstreamPath] = System.currentTimeMillis() to body
                    }
                    return jsonResponse(200, String(body, StandardCharsets.UTF_8))
                } finally {
                    conn.disconnect()
                }
            } catch (e: Exception) {
                // try next domain
            }
        }

        synchronized(weaoCache) {
            val stale = weaoCache[upstreamPath]
            if (stale != null) return jsonResponse(200, String(stale.second, StandardCharsets.UTF_8))
        }
        return jsonResponse(502, """{"error":"weao_unavailable"}""")
    }

    private fun handleAiChat(request: WebResourceRequest): WebResourceResponse {
        // Read the POST body (JSON { messages: [{role, content}] })
        val bodyText = try {
            request.requestBody?.let { String(readAll(it), StandardCharsets.UTF_8) } ?: ""
        } catch (e: Exception) {
            ""
        }
        if (bodyText.isBlank()) return jsonResponse(400, """{"error":"empty_body"}""")

        return try {
            val req = JSONObject(bodyText)
            val messages = req.optJSONArray("messages") ?: JSONArray()
            if (messages.length() == 0) return jsonResponse(400, """{"error":"no_messages"}""")

            // Keep the last N messages (same cap as server.js)
            val trimmed = JSONArray()
            for (i in maxOf(0, messages.length() - 12) until messages.length()) {
                trimmed.put(messages.get(i))
            }

            val payload = JSONObject()
                .put("model", AI_MODEL)
                .put("messages", trimmed)
                .put("stream", false)

            val conn = URL(AI_URL).openConnection() as HttpURLConnection
            try {
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Accept", "application/json")
                conn.connectTimeout = 10_000
                conn.readTimeout = 30_000
                conn.outputStream.use { it.write(payload.toString().toByteArray(StandardCharsets.UTF_8)) }

                if (conn.responseCode !in 200..299) {
                    return jsonResponse(503, """{"error":"AI_UNAVAILABLE"}""")
                }
                val resp = JSONObject(String(readAll(conn.inputStream), StandardCharsets.UTF_8))
                val choices = resp.optJSONArray("choices")
                val content = choices?.optJSONObject(0)?.optJSONObject("message")?.optString("content")
                if (content.isNullOrBlank()) return jsonResponse(503, """{"error":"AI_UNAVAILABLE"}""")
                return jsonResponse(200, JSONObject().put("reply", content).toString())
            } finally {
                conn.disconnect()
            }
        } catch (e: Exception) {
            jsonResponse(503, """{"error":"AI_UNAVAILABLE"}""")
        }
    }

    // ──────────────────────────────────────────────────────────────────────────

    private fun jsonResponse(code: Int, body: String): WebResourceResponse =
        WebResourceResponse(
            "application/json",
            "utf-8",
            code,
            "OK",
            emptyMap(),
            ByteArrayInputStream(body.toByteArray(StandardCharsets.UTF_8))
        )

    private fun readAll(stream: InputStream): ByteArray {
        val out = ByteArrayOutputStream()
        val buf = ByteArray(8192)
        while (true) {
            val n = stream.read(buf)
            if (n < 0) break
            out.write(buf, 0, n)
        }
        return out.toByteArray()
    }

    private fun guessMimeType(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html", "htm" -> "text/html"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            "ico" -> "image/x-icon"
            "json" -> "application/json"
            "txt" -> "text/plain"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            else -> "application/octet-stream"
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
