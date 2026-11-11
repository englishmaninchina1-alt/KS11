package page.freebuff.ks11

/** Single source of truth for the site the app wraps. */
object AppConfig {
    const val HOME_URL = "https://ks11.freebuff.page/"

    /** Hosts that belong to the app. Everything else is handed to the system. */
    private val internalHosts = listOf("ks11.freebuff.page", "freebuff.page")

    fun isInternal(host: String?): Boolean {
        val name = host?.lowercase()?.trimEnd('.') ?: return false
        return internalHosts.any { name == it || name.endsWith(".$it") }
    }
}
