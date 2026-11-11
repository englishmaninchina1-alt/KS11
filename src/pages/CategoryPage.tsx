import { useMemo, useState } from 'react';
import { getCategory } from '../data';
import { Studio } from '../components/Studio';
import { learnedIn, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { cx } from '../lib/utils';

const shortcuts = [
  { game: 'wordsearch', label: 'Word search', emoji: '🔍' },
  { game: 'memory', label: 'Memory pairs', emoji: '🃏' },
  { game: 'spelling', label: 'Spelling bee', emoji: '🐝' },
  { game: 'quiz', label: 'Quick quiz', emoji: '❓' },
];

export function CategoryPage({ id }: { id: string }) {
  const category = getCategory(id);
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const learned = category ? learnedIn(category.words.map((word) => word.id)) : 0;

  const filtered = useMemo(() => {
    if (!category) return [];
    const term = query.trim().toLowerCase();
    if (!term) return category.words;
    return category.words.filter(
      (word) =>
        word.word.toLowerCase().includes(term) ||
        word.meaning.toLowerCase().includes(term) ||
        word.say.toLowerCase().includes(term),
    );
  }, [category, query]);

  if (!category) {
    return (
      <div className="page">
        <div className="panel empty-state">
          <h1>We could not find that world</h1>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/worlds')}>
            Back to all worlds
          </button>
        </div>
      </div>
    );
  }

  const activeIndex = activeId ? category.words.findIndex((word) => word.id === activeId) : -1;
  const activeWord = activeIndex >= 0 ? category.words[activeIndex] : undefined;

  const move = (delta: number) => {
    if (activeIndex < 0) return;
    const next = (activeIndex + delta + category.words.length) % category.words.length;
    setActiveId(category.words[next].id);
  };

  const percent = Math.round((learned / category.words.length) * 100);

  return (
    <div className="page">
      <button type="button" className="btn btn-ghost small back" onClick={() => navigate('/worlds')}>
        ← All worlds
      </button>

      <header className="world-head" style={{ background: category.color }}>
        <div className="world-head-emoji" aria-hidden="true">
          {category.emoji}
        </div>
        <div className="world-head-copy">
          <span className="eyebrow">Word world</span>
          <h1>{category.name}</h1>
          <p>{category.blurb}</p>
          <div className="world-stat-row">
            <span>📚 {category.words.length} words</span>
            <span>⭐ {learned} practised</span>
            <span>🎯 {percent}%</span>
          </div>
          <div className="world-progress big" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
      </header>

      <div className="toolbar">
        <label className="search">
          <span aria-hidden="true">🔎</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a word…"
            aria-label="Search words in this world"
          />
        </label>

        <div className="shortcuts">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.game}
              type="button"
              className="btn btn-ghost small"
              onClick={() => navigate(`/games/${shortcut.game}/${category.id}`)}
            >
              <span aria-hidden="true">{shortcut.emoji}</span> {shortcut.label}
            </button>
          ))}
        </div>
      </div>

      <p className="tap-hint">Tap any word to hear it, see the respelling and record your voice.</p>

      <div className="word-grid">
        {filtered.map((word) => {
          const isLearned = Boolean(progress.learned[word.id]);
          return (
            <button
              key={word.id}
              type="button"
              className={cx('word-card', isLearned && 'is-learned')}
              onClick={() => setActiveId(word.id)}
            >
              <span className="word-card-emoji" aria-hidden="true">
                {word.emoji}
              </span>
              <span className="word-card-word">{word.word}</span>
              <span className="word-card-say">{word.say}</span>
              <span className="word-card-star" aria-hidden="true">
                {isLearned ? '⭐' : '🔊'}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="panel empty-state">
          <p>No words match “{query}”. Try another spelling.</p>
        </div>
      )}

      {activeWord && (
        <Studio
          word={activeWord}
          category={category}
          index={activeIndex}
          total={category.words.length}
          onClose={() => setActiveId(null)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
        />
      )}
    </div>
  );
}
