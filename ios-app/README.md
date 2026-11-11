# Wordy World for iOS

A minimal, native-feeling SwiftUI wrapper around the live KS1 site at
**https://ks11.freebuff.page/**. It is a three-file app: a SwiftUI shell, a
`WKWebView` bridge, and a small state model.

```
ios-app/
├── WordyWorld.xcodeproj/
├── WordyWorld/
│   ├── WordyWorldApp.swift     App entry point
│   ├── ContentView.swift       Loading bar, first-load spinner, error card
│   ├── WebView.swift           WKWebView + navigation/UI delegates
│   ├── WebViewModel.swift      Site URL, allowed hosts, published state
│   ├── Info.plist              Display name, orientations, microphone copy
│   └── Assets.xcassets/        App icon + accent colour
└── README.md
```

## Running it

1. Open `ios-app/WordyWorld.xcodeproj` in Xcode 15 or newer.
2. Select the **WordyWorld** target → *Signing & Capabilities* → choose your team.
   The bundle identifier is `page.freebuff.ks11`; change it if that clashes with
   an identifier you already use.
3. Pick an iPhone or iPad simulator (iOS 16+) and press **Run**.

No packages or CocoaPods are needed — the project has no dependencies.

### First build, step by step

1. **Check Xcode.** Xcode 15 or newer (iOS 16 SDK). `xcode-select -p` should print
   `/Applications/Xcode.app/Contents/Developer`; if it prints the CommandLineTools
   path, run `sudo xcode-select -s /Applications/Xcode.app`.
2. **Open the project file, not the folder.**
   `open ios-app/WordyWorld.xcodeproj`. Opening `ios-app/` or the `WordyWorld`
   source folder gives you a plain directory with no scheme, which is the single
   most common reason the app will not run.
3. **Wait for indexing.** The scheme **WordyWorld** appears in the toolbar once
   the project loads. Pick an iPhone simulator (iOS 16+) as the destination.
4. **Press ⌘R.** Simulator builds need no signing, so if you only want to see the
   site load, stop here. The first build takes a minute while Xcode warms up.
5. **Only for a real device:** select the **WordyWorld** target → *Signing &
   Capabilities* → tick *Automatically manage signing* → choose your Team. If
   Xcode says the bundle identifier is taken, change `page.freebuff.ks11` to any
   reverse-DNS string that is yours. Then trust the developer certificate on the
   device under *Settings → General → VPN & Device Management*.
6. **What a good first run looks like:** a brief progress bar and spinner, then
   the Wordy World home page. Rotate to landscape: the page reflows and the
   content stays clear of the notch. Turn off Wi-Fi and relaunch: you get the
   "Can't reach Wordy World" card with a working **Try again** button.

### If the first build fails

| Xcode message | Cause and fix |
| --- | --- |
| `Signing for "WordyWorld" requires a development team` | Expected with no team baked in. Use a simulator, or set your Team in *Signing & Capabilities*. |
| `Failed to register bundle identifier` | `page.freebuff.ks11` already exists on that team. Pick another identifier in *Signing & Capabilities*. |
| `No such module 'WebKit'` | The destination is macOS, not iOS. Select an iPhone/iPad simulator in the scheme. |
| `Cannot find 'ContentView' in scope` | A source file lost its Target Membership. Select it, open the File inspector, and tick **WordyWorld** under *Target Membership*. |
| `Info.plist ... could not be found` | The project was opened from the wrong directory. Reopen `ios-app/WordyWorld.xcodeproj`. |
| `Multiple commands produce .../Info.plist` | `Info.plist` was added to *Copy Bundle Resources*. Select it in the project navigator and untick that membership; it belongs only in `INFOPLIST_FILE`. |
| `The app icon set "AppIcon" has an unassigned child` | A warning, not an error: the placeholder `AppIcon.png` is present. Replace it before shipping. |
| `Unable to boot the Simulator` | Restart the simulator (`Device → Erase All Content and Settings`) or reboot Xcode; nothing in the project causes this. |

Paste the **first** red error line (and the file/line it points at) into the chat
and it can be fixed directly; later errors are usually knock-on effects.

## What the wrapper does

**Points at the live site.** `AppConfig.homeURL` in `WebViewModel.swift` is the
only place the address appears; change it to retarget the app.

**Loading indicator.** `estimatedProgress` is observed from the web view, so a
3-point capsule under the status bar tracks the real page progress and fades out
when loading finishes. The very first load also shows a centred spinner, so a
cold start never looks frozen. Both are hidden while the error card is up.

**Safe areas.** The web view is full bleed (`.ignoresSafeArea()`), with
`contentInsetAdjustmentBehavior = .always`, so the page paints behind the notch
and the home indicator while its content still starts below the status bar and
above the gesture bar. The window background colour fills any gap, and the
progress bar stays inside the top safe area. The scroll view uses an interactive
keyboard dismissal mode so a child can swipe the keyboard away after typing in
the story coach.

**Native link behaviour.** `WKNavigationDelegate` allows only
`ks11.freebuff.page` (plus `*.freebuff.page`, which covers the old host's
redirect) to load in place. Any other `http(s)` link is handed to Safari with the
navigation cancelled, so an outbound link can never trap the child inside a web
view with no address bar. `mailto:`, `tel:` and other schemes go to the system.
`target="_blank"` links and `window.open` are caught by
`WKUIDelegate.createWebViewWith`: same-site URLs load in place, everything else
opens externally, and no popup windows are ever created.

**Native permissions.** The site's pronunciation recorder needs the microphone,
so `webView(_:requestMediaCapturePermissionFor:...)` grants microphone access for
the Wordy World host and denies camera and any other origin. `Info.plist` carries
the matching `NSMicrophoneUsageDescription`. Audio playback is allowed inline and
without a user gesture.

**Failure and recovery.** Offline or DNS failures on the first load replace the
blank screen with a friendly card ("Check your internet connection…") and a
**Try again** button. A failure later on is ignored rather than covering a page
that is already working, and if iOS kills the web content process the page
reloads itself.

**Session persistence.** The default `WKWebsiteDataStore` is persistent, so a
student's badge sign-in survives app restarts. Progress itself is still stored
in the site's `localStorage`, exactly as in Safari.

## Notes before shipping

- **App icon** — `AppIcon.png` is finished Hoot the Owl artwork: 1024×1024,
  fully opaque (no alpha channel) and with no rounded corners baked in, so iOS
  applies its own mask.
- **App Store review** — apps that are only a website wrapper are often rejected
  under guideline 4.2 ("Minimum Functionality"). If this is going to the App
  Store rather than to families via TestFlight or the enterprise programme, the
  wrapper usually needs native value on top: offline access, saved progress in
  account context, notifications, or a native game.
- **Signing** — no `DEVELOPMENT_TEAM` is baked in; pick your team in Xcode.
- **Verification** — the project files, plist, asset catalog and icon were
  validated structurally, but this workspace has no macOS/Xcode toolchain, so the
  app has not been compiled here. Expect to build once in Xcode before trusting
  a release.
