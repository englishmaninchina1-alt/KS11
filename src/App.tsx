import { useEffect } from 'react';
import { Header } from './components/Header';
import { CategoryPage } from './pages/CategoryPage';
import { GamesHub } from './pages/GamesHub';
import { GamePage } from './pages/GamePage';
import { Home } from './pages/Home';
import { ProgressPage } from './pages/ProgressPage';
import { SignIn } from './pages/SignIn';
import { StoryCoach } from './pages/StoryCoach';
import { Worlds } from './pages/Worlds';
import { loadAuth } from './lib/auth';
import { parseRoute, useRoute } from './lib/router';
import { initSpeech } from './lib/speech';
import { unlockAudio } from './lib/sfx';

export default function App() {
  const route = useRoute();
  const parts = parseRoute(route);

  useEffect(() => {
    initSpeech();
    void loadAuth();
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  let page = <Home />;
  if (parts[0] === 'worlds') page = <Worlds />;
  else if (parts[0] === 'world' && parts[1]) page = <CategoryPage id={parts[1]} />;
  else if (parts[0] === 'games' && !parts[1]) page = <GamesHub />;
  else if (parts[0] === 'games' && parts[1]) {
    page = <GamePage gameId={parts[1]} categoryId={parts[2]} />;
  } else if (parts[0] === 'progress') page = <ProgressPage />;
  else if (parts[0] === 'story') page = <StoryCoach />;
  else if (parts[0] === 'signin') page = <SignIn />;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header route={route} />
      <main id="main">{page}</main>
      <footer className="site-footer">
        <div>
          <strong>🦉 Wordy World</strong>
          <p>Little words, big adventures. Made for curious learners in Years 1 and 2.</p>
        </div>
        <div>
          <p>
            Follows the UK KS1 English programme of study. Progress is saved in this browser only.
          </p>
        </div>
      </footer>
    </div>
  );
}
