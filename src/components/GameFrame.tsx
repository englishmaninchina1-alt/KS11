import type { ReactNode } from 'react';
import type { Category } from '../data';
import { navigate } from '../lib/router';

type GameFrameProps = {
  title: string;
  emoji: string;
  category: Category;
  accent?: string;
  score?: ReactNode;
  onRestart?: () => void;
  children: ReactNode;
};

export function GameFrame({ title, emoji, category, accent, score, onRestart, children }: GameFrameProps) {
  return (
    <section className="game-frame" style={accent ? { background: accent } : undefined}>
      <div className="game-bar">
        <button
          type="button"
          className="btn btn-ghost small"
          onClick={() => navigate(`/games/${category.id}`)}
        >
          ← Games
        </button>
        <div className="game-heading">
          <h1>
            <span aria-hidden="true">{emoji}</span> {title}
          </h1>
          <p>
            {category.emoji} {category.name}
          </p>
        </div>
        <div className="game-bar-right">
          {score && <div className="score-chip">{score}</div>}
          {onRestart && (
            <button type="button" className="btn btn-ghost small" onClick={onRestart}>
              🔄 New
            </button>
          )}
        </div>
      </div>
      <div className="game-body">{children}</div>
    </section>
  );
}
