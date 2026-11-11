package page.freebuff.ks11

import android.Manifest
import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateLayoutParams
import page.freebuff.ks11.databinding.ActivityMainBinding

/**
 * A thin, native-feeling shell around the live Wordy World site.
 *
 * The page scrolls edge to edge with its content inset inside the system bars,
 * links stay in the app only when they belong to the site, and the hardware back
 * button walks the page history before it leaves the app.
 */
class MainActivity : ComponentActivity() {

    private lateinit var binding: ActivityMainBinding
    private var hasLoadedOnce = false
    private var pendingPermissionRequest: PermissionRequest? = null

    /** WebView cannot synthesise speech, so the page speaks through this bridge. */
    private lateinit var speech: WordySpeech

    /** The site's pronunciation recorder asks for the microphone; ask the user once. */
    private val requestMicrophone =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingPermissionRequest
            pendingPermissionRequest = null
            when {
                request == null -> Unit
                granted -> request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                else -> request.deny()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Light bars over the cream page, with the web view drawing underneath them.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        )

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        applyWindowInsets()
        speech = WordySpeech(this)
        configureWebView()
        configureErrorCard()
        configureBackNavigation()

        binding.webView.loadUrl(AppConfig.HOME_URL)
    }

    /**
     * Keeps page content clear of the notch, status bar, gesture bar and keyboard
     * while the background colour still fills those areas.
     */
    private fun applyWindowInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { _, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val keyboard = insets.getInsets(WindowInsetsCompat.Type.ime())

            binding.webView.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, keyboard.bottom))
            binding.progressBar.updateLayoutParams<FrameLayout.LayoutParams> {
                topMargin = bars.top
                leftMargin = bars.left
                rightMargin = bars.right
            }
            insets
        }
    }

    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(this) {
            if (binding.webView.canGoBack()) {
                binding.webView.goBack()
            } else {
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val webView = binding.webView
        webView.setBackgroundColor(Color.TRANSPARENT)
        webView.addJavascriptInterface(speech, "WordySpeech")

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // The site keeps a student's badge sign-in in a cookie.
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean = handleUri(request.url)

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                showLoading()
            }

            override fun onPageFinished(view: WebView, url: String?) {
                hasLoadedOnce = true
                hideLoading()
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                if (!request.isForMainFrame) return
                handleLoadError(error.errorCode)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progressBar.progress = newProgress
                val loading = newProgress in 1..99
                binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                val wantsMicrophone =
                    request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)

                if (!wantsMicrophone || !AppConfig.isInternal(request.origin.host)) {
                    request.deny()
                    return
                }

                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED

                if (granted) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                } else {
                    pendingPermissionRequest = request
                    requestMicrophone.launch(Manifest.permission.RECORD_AUDIO)
                }
            }

            /**
             * `target="_blank"` and `window.open` have no window to open in, so a
             * throwaway web view captures the address and hands it to [handleUri].
             */
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val context = view?.context ?: return false
                val message = resultMsg ?: return false

                val probe = WebView(context)
                probe.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        probeView: WebView,
                        request: WebResourceRequest
                    ): Boolean {
                        handleUri(request.url)
                        probeView.destroy()
                        return true
                    }
                }

                (message.obj as? WebView.WebViewTransport)?.webView = probe
                message.sendToTarget()
                return true
            }
        }
    }

    private fun configureErrorCard() {
        binding.retryButton.setOnClickListener {
            binding.errorCard.visibility = View.GONE
            binding.loadingSpinner.visibility = View.VISIBLE

            val current = binding.webView.url
            if (current.isNullOrBlank() || current == "about:blank") {
                binding.webView.loadUrl(AppConfig.HOME_URL)
            } else {
                binding.webView.reload()
            }
        }
    }

    /** Returns true when the web view should not load the URI itself. */
    private fun handleUri(uri: Uri): Boolean {
        return when (val scheme = uri.scheme?.lowercase()) {
            "http", "https" -> {
                if (AppConfig.isInternal(uri.host)) {
                    false
                } else {
                    openElsewhere(uri)
                    true
                }
            }

            "about", "data", "blob" -> false

            else -> {
                // mailto:, tel:, intent: and anything else the device may handle.
                if (scheme == null) false else { openElsewhere(uri); true }
            }
        }
    }

    private fun openElsewhere(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // Nothing on this device can open the link, so let the page stay put.
        }
    }

    private fun handleLoadError(errorCode: Int) {
        hideLoading()
        if (hasLoadedOnce) return

        val offline = errorCode == WebViewClient.ERROR_HOST_LOOKUP ||
            errorCode == WebViewClient.ERROR_CONNECT ||
            errorCode == WebViewClient.ERROR_TIMEOUT ||
            errorCode == WebViewClient.ERROR_IO

        binding.errorTitle.setText(if (offline) R.string.error_offline_title else R.string.error_title)
        binding.errorMessage.setText(if (offline) R.string.error_offline_message else R.string.error_message)
        binding.errorCard.visibility = View.VISIBLE
    }

    private fun showLoading() {
        if (!hasLoadedOnce) binding.loadingSpinner.visibility = View.VISIBLE
        binding.errorCard.visibility = View.GONE
    }

    private fun hideLoading() {
        binding.loadingSpinner.visibility = View.GONE
        binding.progressBar.visibility = View.GONE
    }

    override fun onResume() {
        super.onResume()
        if (::binding.isInitialized) binding.webView.onResume()
    }

    override fun onPause() {
        if (::binding.isInitialized) {
            binding.webView.onPause()
            CookieManager.getInstance().flush()
        }
        super.onPause()
    }

    override fun onDestroy() {
        if (::binding.isInitialized) {
            binding.webView.loadUrl("about:blank")
            binding.webView.destroy()
        }
        if (::speech.isInitialized) speech.shutdown()
        super.onDestroy()
    }
}
