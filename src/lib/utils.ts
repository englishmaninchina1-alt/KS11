export function shuffle<T>(input: readonly T[]): T[] {
  const copy = [...input];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickOne<T>(input: readonly T[]): T {
  return input[Math.floor(Math.random() * input.length)];
}

export function sample<T>(input: readonly T[], count: number): T[] {
  return shuffle(input).slice(0, Math.max(0, count));
}

export function lettersOnly(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

export function tileLetters(word: string): string[] {
  return lettersOnly(word).split('');
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function scoreToStars(score: number): number {
  return Math.min(3, Math.max(1, score));
}

/** Spoken text keeps spaces but drops punctuation that trips up speech engines. */
export function spokenText(word: string): string {
  return word.replace(/[-–]/g, ' ').replace(/[^a-zA-Z ]/g, '').trim();
}
