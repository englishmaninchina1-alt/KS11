import { categories } from '../data';
import { pickOne } from '../lib/utils';
import { navigate } from '../lib/router';
import { cx } from '../lib/utils';

type CategoryPickerProps = {
  gameId: string;
  gameName: string;
  gameEmoji: string;
};

export function CategoryPicker({ gameId, gameName, gameEmoji }: CategoryPickerProps) {
  return (
    <div className="picker">
      <div className="picker-head">
        <button type="button" className="btn btn-ghost small" onClick={() => navigate('/games')}>
          ← All games
        </button>
        <h1>
          <span aria-hidden="true">{gameEmoji}</span> {gameName}
        </h1>
        <p>Choose a word world to play with. Each world has 50 words.</p>
      </div>

      <div className="picker-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className="picker-card"
            style={{ background: category.color }}
            onClick={() => navigate(`/games/${gameId}/${category.id}`)}
          >
            <span className="picker-emoji" aria-hidden="true">
              {category.emoji}
            </span>
            <span className="picker-name">{category.name}</span>
            <span className="picker-count">50 words</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={cx('btn', 'btn-primary', 'picker-surprise')}
        onClick={() => navigate(`/games/${gameId}/${pickOne(categories).id}`)}
      >
        🎲 Surprise me!
      </button>
    </div>
  );
}
