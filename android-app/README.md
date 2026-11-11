# Wordy World for Android

A small, native-feeling Kotlin shell around the live KS1 site at
**https://ks11.freebuff.page/**. One activity, one layout, no third-party UI
libraries beyond AndroidX Core and Activity.

```
android-app/
├── app/src/main/
│   ├── java/page/freebuff/ks11/
│   │   ├── MainActivity.kt      WebView, insets, links, microphone, back button
│   │   └── AppConfig.kt         Site URL + allowed hosts
│   ├── res/
│   │   ├── layout/activity_main.xml
│   │   ├── values/              strings, colours, theme
│   │   ├── drawable/bg_error_card.xml
│   │   └── mipmap-*/            launcher icon (adaptive + legacy)
│   └── AndroidManifest.xml
├── gradle/wrapper/              Gradle 8.9 wrapper
├── gradlew, gradlew.bat
├── build.gradle.kts, settings.gradle.kts, gradle.properties
└── README.md
```

## Running it

1. Open **the `android-app` folder itself** in Android Studio (Ladybug or newer).
   Opening the repository root will not find the Android project.
2. Let Gradle sync. It downloads AGP 8.7.3, Kotlin 2.0.21 and the AndroidX
   libraries, so the first sync needs a network connection.
3. If Studio asks for an SDK, install **Android 15 (API 35)** — it is the
   `compileSdk` and `targetSdk`.
4. Pick an emulator or a connected phone (Android 7.0 / API 24 or newer) and
   press **Run**.

From a terminal: `./gradlew :app:assembleDebug` produces
`app/build/outputs/apk/debug/app-debug.apk`.

## What the wrapper does

**Points at the live site.** `AppConfig.HOME_URL` is the only place the address
appears. `AppConfig.isInternal` decides what counts as "still Wordy World":
`ks11.freebuff.page` plus `*.freebuff.page`, which covers the old host's redirect.

**Loading indicators.** A 3dp progress bar pinned under the status bar mirrors
`WebChromeClient.onProgressChanged`, and a centred spinner covers the very first
cold load so the app never looks frozen.

**Edge-to-edge with real safe areas.** `enableEdgeToEdge()` lets the page paint
behind the status bar, notch and gesture bar, while an insets listener pads the
web view by `systemBars() or displayCutout()` and extends that bottom padding for
the keyboard (`WindowInsetsCompat.Type.ime()`), so the story coach's text fields
stay above the keyboard. The cream window background fills whatever the page
does not paint.

**Link handling.** Same-site `http(s)` links load in place. Anything else —
another website, `mailto:`, `tel:`, an app link — is opened with
`Intent.ACTION_VIEW`, with the navigation cancelled so the child is never stuck
in a web view with no address bar. `target="_blank"` and `window.open` are
captured by `onCreateWindow` through a throwaway web view and routed the same
way, so no popup windows are created.

**Back button.** Hardware/gesture back walks the web page's own history first
and only leaves the app when there is nowhere left to go, via
`OnBackPressedDispatcher`.

**Microphone.** The pronunciation recorder calls `getUserMedia`. The app answers
`WebChromeClient.onPermissionRequest` by granting audio capture only for the
Wordy World host, asking for `RECORD_AUDIO` at runtime the first time, and
denying camera and every other origin. `AndroidManifest.xml` declares
`RECORD_AUDIO` and `INTERNET`, and the app is HTTPS-only
(`usesCleartextTraffic="false"`, mixed content never allowed).

**Failure and recovery.** A first-load network failure replaces the blank screen
with a friendly card and a **Try again** button; a failure after the site has
loaded is ignored so a working page is never covered. Cookies are flushed on
pause, so a student's badge sign-in survives restarts.

## Before you ship

- **App icon** — Hoot the Owl artwork is included at every density: legacy
  square icons, an adaptive foreground with the halo inside the 66% safe zone,
  and a monochrome layer for Android 13+ themed icons.
- **Speech** — Android WebView has no speech synthesis, so `WordySpeech.kt`
  exposes a `WordySpeech` JavaScript bridge and the site's `speech.ts` prefers it
  when present. Words are spoken by the device's text-to-speech engine in British
  English, at normal and slow speeds; a device with no TTS voice installed stays
  silent. The manifest declares the `TTS_SERVICE` query that Android 11+ needs to
  find engines.
- **Signing** — release builds are signed with the upload key at
  `keystore/wordyworld-upload.jks`, read from `keystore.properties` by
  `app/build.gradle.kts`. Both files are gitignored: **back them up**, because
  every future update must be signed with the same key. To use your own key
  instead, replace both files (`keytool -genkeypair -keystore keystore/...`)
  and rebuild. Without `keystore.properties` the release task still runs, it
  just produces an unsigned APK.
- **Play Store policy** — an app that is only a website wrapper can be rejected
  under Google Play's minimum-functionality and "webview shell" policies. If you
  plan to publish rather than sideload, add native value (offline play, saved
  progress, notifications) or publish as a Trusted Web Activity instead.
- **Emulator testing** — `bash android-app/scripts/emulator-test.sh [apk]`
  boots a headless emulator (or reuses one that is already attached), installs
  the APK and checks the word pop-up is on screen, that the speech bridge reaches
  Android text-to-speech, and that the recorder starts. It requires `/dev/kvm`;
  the build sandbox here does not grant it (`/dev/kvm` is root-only and `sudo` is
  blocked), so the checks recorded below are structural rather than device runs.
  `STRICT=1` turns the speech and recording warnings into failures.
- **CI** — `.github/workflows/android-emulator.yml` runs that harness on every
  push to `android-app/`, `src/` or `public/`. GitHub-hosted Ubuntu runners have
  KVM, the workflow enables it, builds a debug APK, boots an API 30 Google APIs
  emulator through `android-emulator-runner` and uploads the screenshots, UI dumps
  and logcat as the `emulator-output` artifact.
- **Verification** — built here with Temurin JDK 17.0.21, Android SDK platform
  35, Build-Tools 35.0.0, Gradle 8.9 and AGP 8.7.3. `assembleDebug`,
  `assembleRelease` and `lintDebug` all pass with no lint errors. The signed
  release APK is written by
  `./gradlew :app:assembleRelease :app:versionedReleaseApk` to
  `app/build/outputs/apk/versioned/wordy-world-android-<version>.apk`.
- **Versioning** — bump `appVersionCode` and `appVersionName` in
  `app/build.gradle.kts` for each release. The filename follows `versionName`
  automatically, so `1.1` produces `wordy-world-android-1.1.apk`.

## If the first build fails

| Message | Cause and fix |
| --- | --- |
| `SDK location not found` | Android Studio has no SDK configured. Install API 35 in *SDK Manager*, or set `sdk.dir` in `local.properties`. |
| `Unsupported class file major version` | Gradle is running on an old JDK. Use the bundled JDK 17: *Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK*. |
| `Could not resolve com.android.tools.build:gradle` | No network, or the `google()` repository is missing from `settings.gradle.kts`. |
| `Unresolved reference: databinding` | View binding is off. Check `buildFeatures { viewBinding = true }` in `app/build.gradle.kts`, then *Sync Project with Gradle Files*. |
| `Manifest merger failed` | A duplicate permission or activity was added to `AndroidManifest.xml`; the current manifest needs no merging rules. |
| `Cleartext HTTP traffic not permitted` | Expected: the app only talks to HTTPS. A plain-`http` URL will not load by design. |
