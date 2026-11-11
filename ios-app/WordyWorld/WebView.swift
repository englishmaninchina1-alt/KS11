import SwiftUI
import UIKit
import WebKit

/// Bridges a `WKWebView` into SwiftUI and keeps it behaving like part of the app:
/// internal links stay inside, outside links leave for Safari, and new windows,
/// popups and the microphone are handled deliberately.
struct WebView: UIViewRepresentable {

    @ObservedObject var model: WebViewModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()

        // The site plays pronunciation audio and lets children record themselves.
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        // Popups are routed through the coordinator instead of opening windows.
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator

        // The page scrolls edge to edge, but its content stays clear of the notch,
        // the status bar and the home indicator.
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.scrollView.keyboardDismissMode = .interactive
        webView.allowsBackForwardNavigationGestures = false

        // Let the app's background show through while the page paints.
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        context.coordinator.attach(to: webView)
        model.webView = webView
        webView.load(URLRequest(url: AppConfig.homeURL))

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Nothing to push down: the web view owns its own state.
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        coordinator.detach()
        uiView.navigationDelegate = nil
        uiView.uiDelegate = nil
    }

    // MARK: - Coordinator

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {

        private let model: WebViewModel
        private var observations: [NSKeyValueObservation] = []

        init(model: WebViewModel) {
            self.model = model
        }

        func attach(to webView: WKWebView) {
            observations.append(
                webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
                    let value = webView.estimatedProgress
                    DispatchQueue.main.async {
                        self?.model.updateProgress(value)
                    }
                }
            )
        }

        func detach() {
            observations.forEach { $0.invalidate() }
            observations.removeAll()
        }

        // MARK: Loading state

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            model.navigationStarted()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            model.navigationFinished()
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            model.navigationFailed(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            model.navigationFailed(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            // The web content process can be killed under memory pressure; recover silently.
            webView.reload()
        }

        // MARK: Link handling

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            switch url.scheme?.lowercased() {
            case "http", "https":
                if AppConfig.isInternal(url) {
                    decisionHandler(.allow)
                } else {
                    // An outside website: hand it to Safari rather than showing it
                    // inside the app with no address bar or back button.
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                    decisionHandler(.cancel)
                }

            case "about", "data", "blob":
                decisionHandler(.allow)

            default:
                // mailto:, tel:, sms:, and any other scheme the system knows.
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
                decisionHandler(.cancel)
            }
        }

        /// `target="_blank"` links and `window.open` calls have no window to open in,
        /// so load same-site URLs in place and send everything else to the system.
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            guard let url = navigationAction.request.url else { return nil }

            if AppConfig.isInternal(url) {
                webView.load(URLRequest(url: url))
            } else if let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }

            return nil
        }

        /// Answers the site's microphone request for the pronunciation recorder.
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            let allowed = type == .microphone && AppConfig.isInternal(host: origin.host)
            decisionHandler(allowed ? .grant : .deny)
        }
    }
}
