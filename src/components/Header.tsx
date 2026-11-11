import { totalWords } from '../data';
import { useAuth } from '../lib/auth';
import { totalStars, useProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { cx } from '../lib/utils';

const links = [
  { to: '/', label: 'Home', emoji: '🏠' },
  { to: '/worlds', label: 'Word Worlds', emoji: '🌍' },
  { to: '/games', label: 'Games', emoji: '🎮' },
  { to: '/story', label: 'Story', emoji: '📖' },
  { to: '/progress', label: 'My Stars', emoji: '⭐' },
];

function isActive(route: string, to: string): boolean {
  if (to === '/') return route === '/' || route === '';
  return route.startsWith(to);
}

export function Header({ route }: { route: string }) {
  const progress = useProgress();
  const { student } = useAuth();
  const learned = Object.keys(progress.learned).length;

  return (
    <header className="site-header">
      <button type="button" className="brand" onClick={() => navigate('/')}>
        <span className="brand-owl" aria-hidden="true">
          🦉
        </span>
        <span className="brand-text">
          <strong>Wordy World</strong>
          <small>English adventures for KS1</small>
        </span>
      </button>

      <nav className="main-nav" aria-label="Main navigation">
        {links.map((link) => (
          <button
            key={link.to}
            type="button"
            className={cx('nav-link', isActive(route, link.to) && 'is-active')}
            onClick={() => navigate(link.to)}
            aria-current={isActive(route, link.to) ? 'page' : undefined}
          >
            <span aria-hidden="true">{link.emoji}</span>
            <span>{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="header-stats">
        <span className="pill pill-stars" title="Stars earned in games">
          ⭐ {totalStars()}
        </span>
        <span className="pill" title="Words you have practised">
          📚 {learned}/{totalWords}
        </span>
        <button
          type="button"
          className={cx('pill', 'pill-student', student && 'is-signed-in')}
          onClick={() => navigate('/signin')}
          title={student ? 'You are signed in' : 'Sign in or make a badge'}
        >
          {student ? `👋 ${student.name}` : '👤 Sign in'}
        </button>
      </div>
    </header>
  );
}
