import SwiftUI

struct ContentView: View {

    @StateObject private var model = WebViewModel()

    var body: some View {
        ZStack(alignment: .top) {
            // The page is full bleed; the colour shows in the safe areas and
            // behind the page while it paints.
            Color(.systemBackground)
                .ignoresSafeArea()

            WebView(model: model)
                .ignoresSafeArea()

            if model.loadFailure == nil {
                LoadingIndicator(progress: model.progress, isVisible: model.isLoading)

                if model.isFirstLoad && model.isLoading {
                    ProgressView()
                        .controlSize(.large)
                        .tint(.accentColor)
                        .padding(22)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .accessibilityLabel("Loading Wordy World")
                        // The ZStack is top-aligned for the progress bar, so this
                        // fills the screen and centres the spinner itself.
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .transition(.opacity)
                }
            }

            if let failure = model.loadFailure {
                LoadFailureView(failure: failure, retry: model.retry)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: model.loadFailure)
        .animation(.easeInOut(duration: 0.2), value: model.isFirstLoad)
    }
}

/// A thin bar pinned under the status bar while the page loads.
private struct LoadingIndicator: View {

    let progress: Double
    let isVisible: Bool

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Color.clear
                Capsule()
                    .fill(Color.accentColor)
                    .frame(width: max(8, proxy.size.width * progress), height: 3)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .frame(height: 3)
        .opacity(isVisible ? 1 : 0)
        .animation(.easeOut(duration: 0.25), value: progress)
        .animation(.easeOut(duration: 0.25), value: isVisible)
        .accessibilityHidden(true)
    }
}

/// Shown instead of a blank white screen when the site cannot be reached.
private struct LoadFailureView: View {

    let failure: WebViewModel.LoadFailure
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 46, weight: .semibold))
                .foregroundStyle(.orange)
                .accessibilityHidden(true)

            Text(failure.title)
                .font(.title3.weight(.bold))
                .multilineTextAlignment(.center)

            Text(failure.message)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try again", action: retry)
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .controlSize(.large)
                .padding(.top, 4)
        }
        .padding(28)
        .frame(maxWidth: 360)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground).opacity(0.92).ignoresSafeArea())
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
