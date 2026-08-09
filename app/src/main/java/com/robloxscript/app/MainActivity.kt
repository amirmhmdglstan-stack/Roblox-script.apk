package com.robloxscript.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.MimeTypeMap
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import java.io.IOException

/**
 * Roblox Script — Android app.
 *
 * The full web app (React + Supabase) is bundled inside the APK under
 * `app/src/main/assets/www` and served locally through WebViewAssetLoader,
 * exactly like a normal website — so the app looks and behaves 100% like
 * the original web project, even offline.
 *
 * The bundled site's HTML references its files with absolute paths
 * (e.g. "/assets/index-<hash>.js"), so we register the path handler on "/"
 * with the "www" asset folder as root. That way:
 *   https://appassets.androidplatform.net/index.html        -> assets/www/index.html
 *   https://appassets.androidplatform.net/assets/index.js   -> assets/www/assets/index.js
 */
class MainActivity : AppCompatActivity() {

    companion object {
        /** Host used to serve the bundled web app (Google's official local WebView host). */
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val LOCAL_INDEX = "https://$APP_HOST/index.html"

        /**
         * OPTIONAL — remote mode.
         * If you deploy the web app somewhere (e.g. Render), put the URL here
         * (for example "https://roblox-script.onrender.com") and the app will
         * load it from there instead of the bundled copy. Leave "" for bundled.
         */
        private const val REMOTE_URL = ""
    }

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    private val assetLoader: WebViewAssetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/", object : WebViewAssetLoader.PathHandler {
                override fun handle(path: String): WebResourceResponse? {
                    // path is like "/index.html" or "/assets/index-<hash>.js"
                    // (ignore any query string / fragment just in case)
                    val cleanPath = path.substringBefore('?').substringBefore('#')
                    val assetPath = "www" + cleanPath
                    return try {
                        val stream = assets.open(assetPath)
                        WebResourceResponse(guessMimeType(assetPath), null, stream)
                    } catch (e: IOException) {
                        null // file not found -> WebView will fall back to onReceivedError
                    }
                }
            })
            .build()
    }

    private fun guessMimeType(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase()
        return when (ext) {
            "html", "htm" -> "text/html; charset=utf-8"
            "js", "mjs" -> "application/javascript"
            "css" -> "text/css; charset=utf-8"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            "ico" -> "image/x-icon"
            "json" -> "application/json"
            "txt" -> "text/plain; charset=utf-8"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "xml" -> "application/xml"
            "wasm" -> "application/wasm"
            else -> MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                ?: "application/octet-stream"
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
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            setSupportZoom(false)
            mediaPlaybackRequiresUserGesture = false
            // Remove the "; wv" marker so the site can't tell this is a WebView
            userAgentString = userAgentString.replace("; wv", "")
        }

        webView.webViewClient = object : WebViewClient() {

            // Serve the bundled web app from assets/www at the root of the local host
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url: Uri = request.url
                if (url.host == APP_HOST) {
                    // Links like href="/" -> open the app's index.html instead of a folder
                    if (url.path.isNullOrEmpty() || url.path == "/") {
                        view.loadUrl(LOCAL_INDEX)
                        return true
                    }
                    // Everything else inside the bundled app loads normally
                    return false
                }
                // Any external link opens in the phone's default browser
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (e: Exception) {
                    false
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                if (view?.title?.isNotBlank() == true) {
                    title = view.title
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                // SPA fallback: if a deep route inside the bundled app can't be
                // served (e.g. after Android restored the page), go to index.html
                if (request.isForMainFrame && request.url.host == APP_HOST) {
                    webView.loadUrl(LOCAL_INDEX)
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }

        // Physical / gesture back button = back button inside the app
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        // Restore page & history after Android recreated the activity
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            webView.loadUrl(if (REMOTE_URL.isNotBlank()) REMOTE_URL else LOCAL_INDEX)
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
