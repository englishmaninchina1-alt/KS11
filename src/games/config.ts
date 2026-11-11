export type GameConfig = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  skill: string;
  colour: string;
};

export const games: GameConfig[] = [
  {
    id: 'wordsearch',
    name: 'Word Search',
    emoji: '🔍',
    blurb: 'Find all ten hidden words in the letter grid.',
    skill: 'Letter patterns & spelling',
    colour: 'linear-gradient(135deg, #fbbf24, #f97316)',
  },
  {
    id: 'memory',
    name: 'Memory Pairs',
    emoji: '🃏',
    blurb: 'Turn over cards and match each picture to its word.',
    skill: 'Word meaning',
    colour: 'linear-gradient(135deg, #34d399, #0d9488)',
  },
  {
    id: 'listen',
    name: 'Listen & Choose',
    emoji: '👂',
    blurb: 'Listen to the spoken word, then pick the right picture.',
    skill: 'Listening & pronunciation',
    colour: 'linear-gradient(135deg, #60a5fa, #4338ca)',
  },
  {
    id: 'spelling',
    name: 'Spelling Bee',
    emoji: '🐝',
    blurb: 'Fill the missing letters to finish each word.',
    skill: 'Spelling',
    colour: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
  },
  {
    id: 'scramble',
    name: 'Word Scramble',
    emoji: '🧩',
    blurb: 'Jumbled letters? Tap them into the right order.',
    skill: 'Spelling & letter order',
    colour: 'linear-gradient(135deg, #c084fc, #7c3aed)',
  },
  {
    id: 'sentence',
    name: 'Sentence Builder',
    emoji: '🧱',
    blurb: 'Put the mixed-up words into a sensible sentence.',
    skill: 'Grammar & word order',
    colour: 'linear-gradient(135deg, #fb7185, #e11d48)',
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    emoji: '❓',
    blurb: 'Ten questions about the words you have learned.',
    skill: 'Vocabulary recall',
    colour: 'linear-gradient(135deg, #38bdf8, #0369a1)',
  },
  {
    id: 'oddone',
    name: 'Odd One Out',
    emoji: '🕵️',
    blurb: 'Three words belong to the world. Spot the stranger!',
    skill: 'Word categories',
    colour: 'linear-gradient(135deg, #a3e635, #4d7c0f)',
  },
];

export function getGame(id: string): GameConfig | undefined {
  return games.find((game) => game.id === id);
}
