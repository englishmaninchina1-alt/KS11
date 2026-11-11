/** Tiny synthesised sound effects so the site works with no audio files. */

let context: AudioContext | undefined;

type AudioContextCtor = typeof AudioContext;

function audioContext(): AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!context) {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return undefined;
    try {
      context = new Ctor();
    } catch {
      return undefined;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function note(
  frequency: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'triangle',
  volume = 0.08,
): void {
  const ctx = audioContext();
  if (!ctx) return;
  const start = ctx.currentTime + startOffset;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const sfx = {
  tap(): void {
    note(540, 0, 0.06, 'sine', 0.05);
  },
  pop(): void {
    note(760, 0, 0.07, 'sine', 0.06);
    note(980, 0.06, 0.09, 'sine', 0.05);
  },
  correct(): void {
    note(659.25, 0, 0.12, 'triangle', 0.07);
    note(880, 0.1, 0.18, 'triangle', 0.07);
  },
  wrong(): void {
    note(233, 0, 0.14, 'sawtooth', 0.045);
    note(196, 0.13, 0.2, 'sawtooth', 0.045);
  },
  win(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      note(frequency, index * 0.11, 0.22, 'triangle', 0.07);
    });
  },
};

export function unlockAudio(): void {
  audioContext();
}
