# Keep the JavaScript bridge intact; the app only exposes standard WebView APIs.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Suppress warnings for AndroidX and Kotlin metadata.
-dontwarn org.jetbrains.annotations.**
