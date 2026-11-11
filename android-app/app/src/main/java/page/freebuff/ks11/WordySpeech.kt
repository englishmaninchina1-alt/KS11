package page.freebuff.ks11

import android.content.Context
import android.media.AudioAttributes
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import java.util.Locale

/**
 * Speaks words for the site.
 *
 * Android's WebView has no Web Speech synthesis of its own, so `speechSynthesis`
 * in the page is empty and every pronunciation button was silent. The site calls
 * `window.WordySpeech.speak(...)` when this bridge is present, and the platform
 * text-to-speech engine says the word in British English instead.
 *
 * Calls that arrive before the engine finishes initialising are queued and played
 * once it is ready, because the engine loads asynchronously.
 */
class WordySpeech(context: Context) {

    private val main = Handler(Looper.getMainLooper())
    private var engine: TextToSpeech? = null
    private var ready = false
    private var queued: Pair<String, Float>? = null
    private var closed = false

    init {
        engine = TextToSpeech(context.applicationContext) { status ->
            val tts = engine ?: return@TextToSpeech
            if (status != TextToSpeech.SUCCESS) return@TextToSpeech

            ready = languageWorks(tts.setLanguage(Locale.UK))
            if (!ready) ready = languageWorks(tts.setLanguage(Locale.ENGLISH))
            if (!ready) return@TextToSpeech

            tts.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            tts.setPitch(1.05f)

            val waiting = queued
            queued = null
            if (waiting != null) speakNow(waiting.first, waiting.second)
        }
    }

    private fun languageWorks(result: Int): Boolean =
        result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED

    @JavascriptInterface
    fun isReady(): Boolean = ready

    @JavascriptInterface
    fun speak(text: String) = say(text, NORMAL_RATE)

    @JavascriptInterface
    fun speakSlow(text: String) = say(text, SLOW_RATE)

    @JavascriptInterface
    fun stop() {
        engine?.stop()
    }

    private fun say(text: String, rate: Float) {
        val words = text.trim().take(MAX_LENGTH)
        if (words.isEmpty() || closed) return

        main.post {
            if (closed) return@post
            if (!ready) {
                // Remember only the latest request: a child tapping twice wants the
                // second word, not a queue of older ones.
                queued = words to rate
                return@post
            }
            speakNow(words, rate)
        }
    }

    private fun speakNow(text: String, rate: Float) {
        val tts = engine ?: return
        tts.setSpeechRate(rate)
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
    }

    /** Release the engine; called from the activity's onDestroy. */
    fun shutdown() {
        closed = true
        queued = null
        ready = false
        engine?.stop()
        engine?.shutdown()
        engine = null
    }

    private companion object {
        const val UTTERANCE_ID = "wordy-world"
        const val NORMAL_RATE = 0.95f
        const val SLOW_RATE = 0.55f
        const val MAX_LENGTH = 400
    }
}
