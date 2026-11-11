import Foundation
import WebKit

/// Everything the app needs to know about the web app it wraps.
enum AppConfig {
    /// The live site. Change this single value to point the app somewhere else
    /// (for example a staging deployment).
    static let homeURL = URL(string: "https://ks11.freebuff.page/")!

    /// Hosts that belong to the app itself. Anything else opens in Safari so the
    /// child never gets trapped in a web view with no way back.
    static let internalHosts = ["ks11.freebuff.page", "freebuff.page"]

    static func isInternal(host: String?) -> Bool {
        guard let host = host?.lowercased() else { return false }
        return internalHosts.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    static func isInternal(_ url: URL) -> Bool {
        isInternal(host: url.host)
    }
}

/// Observable state shared by the SwiftUI chrome and the underlying `WKWebView`.
final class WebViewModel: ObservableObject {

    struct LoadFailure: Equatable {
        let title: String
        let message: String
    }

    /// 0...1, straight from the web view so the progress bar moves with the page.
    @Published private(set) var progress: Double = 0
    @Published private(set) var isLoading = true
    /// Drives the centred spinner: only the very first load gets one.
    @Published private(set) var isFirstLoad = true
    @Published private(set) var loadFailure: LoadFailure?

    weak var webView: WKWebView?
    private var hasLoadedOnce = false

    // MARK: - Events from the web view

    func updateProgress(_ value: Double) {
        progress = min(max(value, 0), 1)
    }

    func navigationStarted() {
        isLoading = true
        loadFailure = nil
        // A new page starts at zero rather than inheriting the last page's 100%.
        progress = 0
    }

    func navigationFinished() {
        isLoading = false
        isFirstLoad = false
        hasLoadedOnce = true
        loadFailure = nil
        progress = 1
    }

    /// Called for committed and provisional failures alike.
    func navigationFailed(_ error: Error) {
        let error = error as NSError

        // A cancelled load (a redirect, or a link we opened elsewhere) is not a failure.
        if error.domain == NSURLErrorDomain, error.code == NSURLErrorCancelled { return }
        // WebKit uses 102 when a page asks for a new window that the app handles itself.
        if error.domain == "WebKitErrorDomain", error.code == 102 { return }

        isLoading = false
        progress = 0

        // Once the site is on screen, keep it there rather than replacing a working
        // page with an error card because one link failed.
        guard !hasLoadedOnce else { return }

        isFirstLoad = false
        loadFailure = Self.failure(for: error)
    }

    // MARK: - Actions

    func retry() {
        guard let webView else { return }

        loadFailure = nil
        isLoading = true
        isFirstLoad = true
        progress = 0

        if let url = webView.url, url.absoluteString != "about:blank" {
            webView.reload()
        } else {
            webView.load(URLRequest(url: AppConfig.homeURL))
        }
    }

    // MARK: - Helpers

    private static func failure(for error: NSError) -> LoadFailure {
        switch error.code {
        case NSURLErrorNotConnectedToInternet,
             NSURLErrorNetworkConnectionLost,
             NSURLErrorCannotFindHost,
             NSURLErrorCannotConnectToHost,
             NSURLErrorDNSLookupFailed,
             NSURLErrorTimedOut,
             NSURLErrorDataNotAllowed:
            return LoadFailure(
                title: "Can't reach Wordy World",
                message: "Check your internet connection, then tap Try again."
            )
        default:
            return LoadFailure(
                title: "Wordy World did not open",
                message: "Something went wrong while loading. Tap Try again to have another go."
            )
        }
    }
}
