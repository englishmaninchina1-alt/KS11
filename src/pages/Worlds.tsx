import { categories, totalWords } from '../data';
import { CategoryCard } from '../components/CategoryCard';
import { learnedIn, useProgress } from '../lib/progress';

export function Worlds() {
  useProgress();

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">
          {categories.length} worlds · {totalWords} words
        </span>
        <h1>Word Worlds</h1>
        <p>
          Pick a topic to explore. Each world holds 50 words with a picture, a meaning, an example
          sentence and a phonetic respelling. Tap a word to hear it and record yourself saying it.
        </p>
      </header>

      <div className="world-grid wide">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            learned={learnedIn(category.words.map((word) => word.id))}
          />
        ))}
      </div>
    </div>
  );
}
