import { categories, totalWords } from '../data';
import { appPlatforms } from '../data/appLinks';
import { games } from '../games/config';
import { CategoryCard } from '../components/CategoryCard';
import { learnedIn, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';

const steps = [
  {
    emoji: '👂',
    title: '1. Listen',
    text: 'Tap a word to hear it. Every word has a friendly phonetic respelling, like EL-i-fant, so you know exactly how to say it.',
  },
  {
    emoji: '🎤',
    title: '2. Say it',
    text: 'Record your voice, play it back and compare it with Hoot the Owl. Then tap the star when you are happy.',
  },
  {
    emoji: '🎮',
    title: '3. Play',
    text: 'Eight games - word search, memory pairs, spelling, quizzes and more - lock the words into your memory.',
  },
];

export function Home() {
  const progress = useProgress();

  return (
    <div className="page home">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Ages 5–7 · UK KS1 English</span>
          <h1>
            Learn English with <span className="sparkle">Hoot the Owl</span>
          </h1>
          <p className="hero-lead">
            {categories.length} word worlds, {totalWords} everyday words, pronunciation practice and
            eight playful games. Everything a young learner needs to grow a big, brave vocabulary.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary big" onClick={() => navigate('/worlds')}>
              🚀 Start exploring
            </button>
            <button type="button" className="btn btn-ghost big" onClick={() => navigate('/games')}>
              🎮 Play games
            </button>
          </div>
          <div className="hero-stats">
            <span>
              <strong>{categories.length}</strong> worlds
            </span>
            <span>
              <strong>{totalWords}</strong> words
            </span>
            <span>
              <strong>{games.length}</strong> games
            </span>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-owl">🦉</div>
          <span className="float float-a">🍎</span>
          <span className="float float-b">🚀</span>
          <span className="float float-c">🌈</span>
          <span className="float float-d">🐘</span>
          <span className="float float-e">⭐</span>
          <span className="float float-f">🎤</span>
          <div className="speech-bubble">Hello! Let's learn together.</div>
        </div>
      </section>

      <section className="panel how">
        <h2>How Wordy World works</h2>
        <div className="step-grid">
          {steps.map((step) => (
            <article key={step.title} className="step-card">
              <span className="step-emoji" aria-hidden="true">
                {step.emoji}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Choose a word world</h2>
          <button type="button" className="btn btn-ghost small" onClick={() => navigate('/worlds')}>
            See all {categories.length} worlds →
          </button>
        </div>
        <div className="world-grid">
          {categories.slice(0, 6).map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              learned={learnedIn(category.words.map((word) => word.id))}
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Games arcade</h2>
          <button type="button" className="btn btn-ghost small" onClick={() => navigate('/games')}>
            All games →
          </button>
        </div>
        <div className="game-strip">
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              className="game-chip"
              style={{ background: game.colour }}
              onClick={() => navigate(`/games/${game.id}`)}
            >
              <span aria-hidden="true">{game.emoji}</span>
              <strong>{game.name}</strong>
              <small>{game.skill}</small>
              {progress.stars[game.id] ? (
                <span className="chip-stars">{'⭐'.repeat(progress.stars[game.id])}</span>
              ) : (
                <span className="chip-stars chip-stars-empty">Play →</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="panel pronounce-panel">
        <div>
          <span className="eyebrow">Pronunciation studio</span>
          <h2>Say it clearly, every time</h2>
          <p>
            Each word comes with a natural phonetic respelling. Capital letters show the strong beat,
            small letters the quiet ones: <strong>butterfly → BUT-er-fly</strong>. Listen to a British
            voice, slow it right down, then record yourself and compare.
          </p>
          <div className="respell-demo" aria-label="Example respellings">
            <span>elephant · <strong>EL-i-fant</strong></span>
            <span>crocodile · <strong>KROK-oh-dyle</strong></span>
            <span>kangaroo · <strong>kan-guh-ROO</strong></span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/world/animals')}>
            Try it with animals 🦁
          </button>
        </div>
        <div className="pronounce-art" aria-hidden="true">
          🎤
        </div>
      </section>

      <section className="panel story-teaser">
        <div>
          <span className="eyebrow">New · Story Studio</span>
          <h2>Write a story with Hoot</h2>
          <p>
            Choose a word world, plan a beginning, a middle and an end, then ask Hoot's story coach
            for praise, a tip and a question to keep you writing. Every tip can be read aloud.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/story')}>
            📖 Open Story Studio
          </button>
        </div>
        <div className="story-teaser-art" aria-hidden="true">
          📖
        </div>
      </section>

      <section className="panel qr-panel">
        <div className="qr-copy">
          <span className="eyebrow">On your phone</span>
          <h2>Take Wordy World with you</h2>
          <p>
            Point a phone camera at the code for your device. The Android code downloads Wordy
            World 1.1 straight away - open the file and allow installs from your browser when your
            phone asks.
          </p>
          <p className="qr-note">
            The iPhone and iPad app is still in testing, so its code opens Wordy World in your
            browser instead. Choose <strong>Add to Home Screen</strong> to keep Hoot one tap away.
            Both apps will move to the App Store and Google Play when they are ready.
          </p>
        </div>
        <div className="qr-codes">
          {appPlatforms.map((platform) => (
            <div key={platform.id} className="qr-code">
              <span className="qr-platform" aria-hidden="true">
                {platform.emoji}
              </span>
              <img
                src={platform.qrSrc}
                alt={platform.alt}
                width={150}
                height={150}
                loading="lazy"
              />
              <strong>{platform.name}</strong>
              <small>{platform.requirement}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="grown-ups">
        <h2>👩‍🏫 For grown-ups</h2>
        <p>
          Wordy World is built around the UK Key Stage 1 English programme of study: everyday
          vocabulary, listening, speaking, spelling patterns and simple sentence building. Words are
          grouped into {categories.length} topics of 50 words each, so a child can revisit a topic until
          it feels easy. Stars and ticked words are saved in this browser only. Signing in is
          optional: a child can make a badge with a name and password, and we store only that name and
          a scrambled password - no email address, no photos, no adverts.
        </p>
      </section>
    </div>
  );
}
