import { games } from '../games/config';
import { useProgress } from '../lib/progress';
import { navigate } from '../lib/router';

export function GamesHub() {
  const progress = useProgress();

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{games.length} playful challenges</span>
        <h1>Games Arcade</h1>
        <p>
          Every game uses words from one word world. Choose a game, choose a world, and play. Your
          best score is kept as stars.
        </p>
      </header>

      <div className="game-grid">
        {games.map((game) => {
          const stars = progress.stars[game.id] ?? 0;
          return (
            <article key={game.id} className="game-card" style={{ background: game.colour }}>
              <div className="game-card-top">
                <span className="game-card-emoji" aria-hidden="true">
                  {game.emoji}
                </span>
                <div className="game-card-stars" aria-label={`${stars} of 3 stars`}>
                  {[1, 2, 3].map((value) => (
                    <span key={value} className={value <= stars ? 'on' : 'off'}>
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <h2>{game.name}</h2>
              <p>{game.blurb}</p>
              <span className="game-card-skill">{game.skill}</span>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => navigate(`/games/${game.id}`)}
              >
                Play {game.name} →
              </button>
            </article>
          );
        })}
      </div>

      <section className="panel tip-panel">
        <h2>🌟 Game tips</h2>
        <ul>
          <li>Play a word world first, then use the games to practise the same 50 words.</li>
          <li>Tap the speaker in Listen &amp; Choose as many times as you like.</li>
          <li>Stuck on Spelling Bee? Listen to the word and say it slowly in your head.</li>
          <li>Three stars means a super score - try to beat your best!</li>
        </ul>
      </section>
    </div>
  );
}
