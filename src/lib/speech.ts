/**
 * Speech helpers.
 *
 * In a browser this uses the Web Speech API. The Android app shows the site in a
 * WebView, which has no speech synthesis of its own, so the app injects a
 * `WordySpeech` bridge that speaks through the platform text-to-speech engine.
 * When that bridge exists it wins, because it is the only one that works there.
 */

const synth: SpeechSynthesis | undefined =
  typeof window !== 'undefined' ? window.speechSynthesis : undefined;

type NativeSpeech = {
  speak?: (text: string) => void;
  speakSlow?: (text: string) => void;
  stop?: () => void;
};

function nativeSpeech(): NativeSpeech | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { WordySpeech?: NativeSpeech }).WordySpeech;
}

let voices: SpeechSynthesisVoice[] = [];
let listening = false;

function loadVoices(): void {
  if (!synth) return;
  try {
    const list = synth.getVoices();
    if (list.length > 0) voices = list;
  } catch {
    voices = [];
  }
}

export function speechSupported(): boolean {
  return Boolean(nativeSpeech()?.speak) || Boolean(synth);
}

export function initSpeech(): void {
  if (!synth || listening) return;
  listening = true;
  loadVoices();
  synth.onvoiceschanged = loadVoices;
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) loadVoices();
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'));
  const british = english.filter((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith('en-gb'),
  );

  const favourites = [
    /google uk english female/i,
    /serena/i,
    /kate/i,
    /sonia/i,
    /daniel/i,
    /british/i,
    /united kingdom/i,
  ];
  for (const pattern of favourites) {
    const match = british.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return british[0] ?? english[0] ?? voices[0];
}

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
};

export function speak(text: string, options: SpeakOptions = {}): void {
  const native = nativeSpeech();
  if (native?.speak) {
    if ((options.rate ?? 0.9) < 0.7 && native.speakSlow) native.speakSlow(text);
    else native.speak(text);
    return;
  }

  if (!synth) return;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.05;
    utterance.volume = 1;
    synth.speak(utterance);
  } catch {
    /* Speech is a bonus: never break the lesson if it fails. */
  }
}

export function speakSlow(text: string): void {
  speak(text, { rate: 0.5 });
}

export function speakCheer(text: string): void {
  speak(text, { rate: 1, pitch: 1.25 });
}

export function stopSpeaking(): void {
  nativeSpeech()?.stop?.();
  try {
    synth?.cancel();
  } catch {
    /* no-op */
  }
}
