export type Word = {
  /** globally unique: `${categoryId}-${slug}` */
  id: string;
  word: string;
  /** Natural Phonetic Respelling, e.g. "EL-i-fant" (caps = stressed syllable) */
  say: string;
  emoji: string;
  meaning: string;
  sentence: string;
};

type WordInput = Omit<Word, 'id'>;

export type Category = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** css gradient used for cards and headers */
  color: string;
  words: Word[];
};

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function w(word: string, say: string, emoji: string, meaning: string, sentence: string): WordInput {
  return { word, say, emoji, meaning, sentence };
}

export function makeCategory(
  id: string,
  name: string,
  emoji: string,
  blurb: string,
  color: string,
  words: WordInput[],
): Category {
  return {
    id,
    name,
    emoji,
    blurb,
    color,
    words: words.map((entry) => ({ ...entry, id: `${id}-${slug(entry.word)}` })),
  };
}

/** Syllables of the respelling, e.g. "EL-i-fant" -> ["EL", "i", "fant"] */
export function syllables(say: string): string[] {
  return say.split('-').filter(Boolean);
}

/** Simple rhyme key: the final respelled syllable, lower-cased. */
export function rhymeKey(say: string): string {
  const parts = syllables(say);
  return (parts[parts.length - 1] ?? '').toLowerCase();
}
