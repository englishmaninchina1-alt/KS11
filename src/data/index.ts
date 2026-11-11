import type { Category, Word } from './types';
import { animals } from './categories/animals';
import { food } from './categories/food';
import { family } from './categories/family';
import { colours } from './categories/colours';
import { numbers } from './categories/numbers';
import { body } from './categories/body';
import { weather } from './categories/weather';
import { home } from './categories/home';
import { school } from './categories/school';
import { transport } from './categories/transport';
import { clothes } from './categories/clothes';
import { feelings } from './categories/feelings';

export const categories: Category[] = [
  animals,
  food,
  family,
  colours,
  numbers,
  body,
  weather,
  home,
  school,
  transport,
  clothes,
  feelings,
];

export const allWords: Word[] = categories.flatMap((c) => c.words);

export const totalWords = allWords.length;

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getWord(id: string): Word | undefined {
  return allWords.find((w) => w.id === id);
}

export type { Category, Word } from './types';
export { syllables, rhymeKey } from './types';
