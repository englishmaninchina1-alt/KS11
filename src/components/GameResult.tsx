import { navigate } from '../lib/router';

type GameResultProps = {
  emoji: string;
  title: string;
  message: string;
  stars: number;
  stats?: Array<{ label: string; value: string | number }>;
  onReplay: () => void;
};

export function GameResult({ emoji, title, message, stars, stats, onReplay }: GameResultProps) {
  return (
    <div className="result">
      <div className="result-emoji" aria-hidden="true">
        {emoji}
      </div>
      <h2>{title}</h2>
      <div className="result-stars" aria-label={`You earned ${stars} of 3 stars`}>
        {[1, 2, 3].map((value) => (
          <span key={value} className={value <= stars ? 'on' : 'off'}>
            ★
          </span>
        ))}
      </div>
      <p>{message}</p>
      {stats && stats.length > 0 && (
        <div className="result-stats">
          {stats.map((stat) => (
            <span key={stat.label}>
              <strong>{stat.value}</strong> {stat.label}
            </span>
          ))}
        </div>
      )}
      <div className="result-actions">
        <button type="button" className="btn btn-primary big" onClick={onReplay}>
          🔄 Play again
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/games')}>
          🎮 Other games
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/progress')}>
          ⭐ My stars
        </button>
      </div>
    </div>
  );
}
