import { useState } from 'react';
import { registerStudent, signInStudent, signOutStudent, useAuth } from '../lib/auth';
import { navigate } from '../lib/router';

type Mode = 'register' | 'signin';

export function SignIn() {
  const { student, ready } = useAuth();
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const result =
      mode === 'register'
        ? await registerStudent(name, password)
        : await signInStudent(name, password);
    setBusy(false);
    if (result.ok) {
      setPassword('');
      navigate('/');
    } else {
      setError(result.message);
    }
  }

  if (student) {
    return (
      <div className="page auth-page">
        <div className="auth-wrap">
          <section className="panel auth-card">
            <div className="auth-badge">
              <span className="auth-badge-emoji" aria-hidden="true">
                🦉
              </span>
              <div>
                <span className="eyebrow">Signed in</span>
                <h1>Hello, {student.name}!</h1>
                <p>Your badge is ready. Your stars and words still live in this browser.</p>
              </div>
            </div>
            <div className="auth-actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/worlds')}>
                🌍 Start learning
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  void signOutStudent();
                }}
              >
                Sign out
              </button>
            </div>
          </section>

          <p className="auth-note">
            Grown-ups: we store only the name and a scrambled (hashed) password. There is no email
            address, no photo and no advertising.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="auth-wrap">
        <section className="panel auth-card">
          <span className="eyebrow">My badge</span>
          <h1>{mode === 'register' ? 'Make your badge' : 'Welcome back'}</h1>
          <p>
            {mode === 'register'
              ? 'Pick a name and a secret password. Then Hoot will remember you when you come back.'
              : 'Type your name and your secret password to sign in.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Sign in or register">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={`auth-tab${mode === 'register' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              ✨ New badge
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              className={`auth-tab${mode === 'signin' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('signin');
                setError('');
              }}
            >
              👋 Sign in
            </button>
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="student-name">Your name</label>
              <input
                id="student-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="username"
                autoCapitalize="words"
                spellCheck={false}
                maxLength={16}
                placeholder="Mia"
                required
              />
              <p className="auth-hint">2 to 16 letters. You can add a number, like Mia2.</p>
            </div>

            <div className="auth-field">
              <label htmlFor="student-password">Secret password</label>
              <div className="auth-password">
                <input
                  id="student-password"
                  name="password"
                  type={reveal ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  maxLength={64}
                  placeholder="At least 6 letters or numbers"
                  required
                />
                <button
                  type="button"
                  className="auth-reveal"
                  onClick={() => setReveal((value) => !value)}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  aria-pressed={reveal}
                >
                  {reveal ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="auth-hint">Keep it secret. Ask a grown-up if you need help.</p>
            </div>

            <div aria-live="polite">
              {error ? (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <button type="submit" className="btn btn-primary big" disabled={busy}>
              {busy ? 'Just a moment…' : mode === 'register' ? '🦉 Make my badge' : '🚪 Sign in'}
            </button>
          </form>

          <div className="auth-guest">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
              🐣 Continue as guest
            </button>
            <p className="auth-hint">No badge needed — you can make one any time.</p>
          </div>

          <p className="auth-note">
            {mode === 'register'
              ? 'Already have a badge? Tap “Sign in” above.'
              : 'New here? Tap “New badge” to make one.'}
          </p>
        </section>

        <section className="panel auth-card">
          <h2>👩‍🏫 For grown-ups</h2>
          <p className="auth-grownup">
            Signing in is optional — every game and word world works without an account. If a child
            makes a badge we store only their chosen display name and a PBKDF2-hashed password in our
            database: no email address, no date of birth, no photos, nothing shared with anyone. The
            password can be reset only by making a new badge, so please help younger children choose
            one they will remember.
          </p>
          {ready ? null : <p className="auth-grownup">Checking whether you are signed in…</p>}
        </section>
      </div>
    </div>
  );
}
