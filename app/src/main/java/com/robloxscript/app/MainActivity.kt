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
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

/**
 * Roblox Script — Android app.
 *
 * The WHOLE application (React UI + all its logic) is bundled INSIDE the APK
 * as a single self-contained file (`app/src/main/assets/www/index.html`) and
 * loaded straight from the APK file via file:///android_asset/www/index.html.
 * No server, no special host, no ES modules, nothing that can fail — the app
 * opens even with airplane mode on.
 *
 * Only live content needs internet, exactly like the website itself:
 *   - scripts & users        -> your Supabase database
 *   - thumbnails             -> Supabase Storage
 *   - fonts (Vazirmatn)      -> Google Fonts (falls back to system font offline)
 */
class MainActivity : AppCompatActivity() {

    companion object {
        /** The bundled app, loaded straight from the APK file. */
        private const val LOCAL_INDEX = "file:///android_asset/www/index.html"

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

    /** Pending file-chooser callback (upload thumbnail in the app). */
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val results = if (result.resultCode == RESULT_OK && result.data != null) {
                arrayOf(result.data!!.data!!)
            } else {
                null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }

    /**
     * Exposed to the app as `window.AndroidBridge.copyToClipboard(text)`.
     * The web app uses this first (it works on file:// pages, unlike the
     * browser clipboard API), then falls back to the standard API.
     */
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
            // Required to open the bundled app straight from the APK file
            allowFileAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            setSupportZoom(false)
            mediaPlaybackRequiresUserGesture = false
            // Remove the "; wv" marker so the site can't tell this is a WebView
            userAgentString = userAgentString.replace("; wv", "")
        }

        // Native clipboard for the app's copy buttons
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url: Uri = request.url
                // The bundled app (file://) and hash navigation load inside the app
                if (url.scheme == "file" || url.scheme == "about") return false
                // External links open in the phone's default browser
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
                // If the bundled page can't be restored (e.g. after Android
                // recreated the activity), simply reload the app from the APK.
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

            // Make window.confirm() work properly (without this, confirmations
            // are silently cancelled and delete buttons would do nothing)
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

            // Show alert() messages as a toast
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

            // Make <input type="file"> (thumbnail upload) open the phone's file picker
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply { type = "*/*" }
                try {
                    fileChooserLauncher.launch(intent)
                    return true
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
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
