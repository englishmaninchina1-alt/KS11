import type { Category } from '../data';
import { navigate } from '../lib/router';

export function CategoryCard({ category, learned }: { category: Category; learned: number }) {
  const percent = Math.round((learned / category.words.length) * 100);

  return (
    <button
      type="button"
      className="world-card"
      style={{ background: category.color }}
      onClick={() => navigate(`/world/${category.id}`)}
    >
      <span className="world-emoji" aria-hidden="true">
        {category.emoji}
      </span>
      <span className="world-body">
        <strong>{category.name}</strong>
        <small>{category.blurb}</small>
        <span className="world-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </span>
        <span className="world-count">
          {category.words.length} words · {learned} practised
        </span>
      </span>
      <span className="world-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}
