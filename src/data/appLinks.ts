export type AppPlatform = {
  id: 'ios' | 'android';
  emoji: string;
  name: string;
  requirement: string;
  /** QR image served from `public/`. */
  qrSrc: string;
  alt: string;
};

/**
 * iOS has no public listing yet, so its code opens the website. The Android code
 * downloads the signed release APK hosted beside the site, under a versioned
 * filename. When versionName changes, republish and regenerate just that code:
 *
 *   npx qrcode -t svg -o public/qr-android.svg "https://ks11.freebuff.page/wordy-world-android-1.1.apk"
 *
 *
 *   npx qrcode -t svg -o public/qr-ios.svg "https://apps.apple.com/app/id000000000"
 *   npx qrcode -t svg -o public/qr-android.svg "https://play.google.com/store/apps/details?id=page.freebuff.ks11"
 */
export const appPlatforms: AppPlatform[] = [
  {
    id: 'ios',
    emoji: '🍎',
    name: 'iPhone & iPad',
    requirement: 'iOS 16 or newer',
    qrSrc: '/qr-ios.svg',
    alt: 'QR code that opens Wordy World on an iPhone or iPad',
  },
  {
    id: 'android',
    emoji: '🤖',
    name: 'Android',
    requirement: 'Android 7 or newer',
    qrSrc: '/qr-android.svg',
    alt: 'QR code that opens Wordy World on an Android phone or tablet',
  },
];
