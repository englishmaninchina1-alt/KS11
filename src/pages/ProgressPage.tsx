import { categories, totalWords } from '../data';
import { games } from '../games/config';
import { learnedIn, resetProgress, totalStars, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { cx } from '../lib/utils';

type Badge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
};

export function ProgressPage() {
  const progress = useProgress();
  const learnedTotal = Object.keys(progress.learned).length;
  const stars = totalStars();
  const completedWorlds = categories.filter(
    (category) => learnedIn(category.words.map((word) => word.id)) === category.words.length,
  ).length;
  const bestWorld = Math.max(
    0,
    ...categories.map((category) => learnedIn(category.words.map((word) => word.id))),
  );

  const badges: Badge[] = [
    { id: 'first', emoji: '🌱', name: 'First word', description: 'Practise your first word', earned: learnedTotal >= 1 },
    { id: 'explorer', emoji: '🧭', name: 'Word explorer', description: 'Practise 25 words', earned: learnedTotal >= 25 },
    { id: 'chatty', emoji: '🎤', name: 'Chatterbox', description: 'Practise 100 words', earned: learnedTotal >= 100 },
    { id: 'owlfriend', emoji: '🦉', name: 'Owl friend', description: 'Practise 250 words', earned: learnedTotal >= 250 },
    { id: 'wordwizard', emoji: '🧙', name: 'Word wizard', description: 'Practise every word (600)', earned: learnedTotal >= totalWords },
    { id: 'wholeworld', emoji: '🌍', name: 'World champion', description: 'Finish all 50 words in one world', earned: completedWorlds >= 1 },
    { id: 'allworlds', emoji: '👑', name: 'King of worlds', description: 'Finish every word in every world', earned: completedWorlds === categories.length },
    { id: 'gamer', emoji: '🎮', name: 'Game starter', description: 'Play 10 games', earned: progress.gamesPlayed >= 10 },
    { id: 'star', emoji: '⭐', name: 'Star collector', description: 'Earn 8 stars', earned: stars >= 8 },
    { id: 'superstar', emoji: '🌟', name: 'Superstar', description: 'Earn 24 stars (three in every game)', earned: stars >= games.length * 3 },
  ];

  const earnedBadges = badges.filter((badge) => badge.earned).length;

  const reset = () => {
    const sure = window.confirm('Clear all stars, ticks and badges on this device?');
    if (sure) resetProgress();
  };

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Saved on this device</span>
        <h1>My Stars</h1>
        <p>
          Every time you practise a word or finish a game, it is remembered here so you can see how
          much you have grown.
        </p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-emoji" aria-hidden="true">📚</span>
          <strong>
            {learnedTotal}<small>/{totalWords}</small>
          </strong>
          <span>words practised</span>
        </div>
        <div className="stat-card">
          <span className="stat-emoji" aria-hidden="true">⭐</span>
          <strong>
            {stars}<small>/{games.length * 3}</small>
          </strong>
          <span>stars earned</span>
        </div>
        <div className="stat-card">
          <span className="stat-emoji" aria-hidden="true">🎮</span>
          <strong>{progress.gamesPlayed}</strong>
          <span>games played</span>
        </div>
        <div className="stat-card">
          <span className="stat-emoji" aria-hidden="true">🏅</span>
          <strong>
            {earnedBadges}<small>/{badges.length}</small>
          </strong>
          <span>badges</span>
        </div>
      </div>

      <section className="panel">
        <h2>My word worlds</h2>
        <div className="progress-list">
          {categories.map((category) => {
            const count = learnedIn(category.words.map((word) => word.id));
            const percent = Math.round((count / category.words.length) * 100);
            return (
              <button
                key={category.id}
                type="button"
                className="progress-row"
                onClick={() => navigate(`/world/${category.id}`)}
              >
                <span className="progress-emoji" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="progress-info">
                  <span className="progress-labels">
                    <strong>{category.name}</strong>
                    <small>
                      {count}/{category.words.length}
                    </small>
                  </span>
                  <span className="world-progress" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {bestWorld === 0 && (
          <p className="hint">
            Tip: open a world, listen to a word and tap “⭐ I said it!” to start your chart.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Game stars</h2>
        <div className="star-list">
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              className="star-row"
              onClick={() => navigate(`/games/${game.id}`)}
            >
              <span className="star-emoji" aria-hidden="true">
                {game.emoji}
              </span>
              <span className="star-name">{game.name}</span>
              <span className="star-marks" aria-label={`${progress.stars[game.id] ?? 0} of 3 stars`}>
                {[1, 2, 3].map((value) => (
                  <span key={value} className={value <= (progress.stars[game.id] ?? 0) ? 'on' : 'off'}>
                    ★
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Badges</h2>
        <div className="badge-grid">
          {badges.map((badge) => (
            <div key={badge.id} className={cx('badge', badge.earned && 'is-earned')}>
              <span className="badge-emoji" aria-hidden="true">
                {badge.emoji}
              </span>
              <strong>{badge.name}</strong>
              <small>{badge.description}</small>
              <span className="badge-state">{badge.earned ? 'Earned!' : 'Locked'}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="reset-row">
        <button type="button" className="btn btn-ghost small" onClick={reset}>
          🧹 Clear my progress
        </button>
      </div>
    </div>
  );
}
