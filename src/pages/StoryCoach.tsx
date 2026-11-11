import { useEffect, useMemo, useRef, useState } from 'react';
import { categories, getCategory } from '../data';
import type { CoachReply, StoryDraft, StoryIdea, StoryPart } from '../lib/story';
import {
  askStory,
  checkCoach,
  countWords,
  emptyDraft,
  loadDraft,
  localCoach,
  localIdea,
  saveDraft,
} from '../lib/story';
import { celebrate } from '../lib/confetti';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { cx, sample } from '../lib/utils';

type PartInfo = {
  key: StoryPart;
  title: string;
  emoji: string;
  className: string;
  hint: string;
  placeholder: string;
  prompts: string[];
};

const PARTS: PartInfo[] = [
  {
    key: 'beginning',
    title: 'Beginning',
    emoji: '🌅',
    className: 'part-beginning',
    hint: 'Who is in your story? Where are they?',
    placeholder: 'Once upon a time, there was…',
    prompts: ['Once upon a time, ', 'One sunny day, '],
  },
  {
    key: 'middle',
    title: 'Middle',
    emoji: '⚡',
    className: 'part-middle',
    hint: 'What goes wrong? How do they feel?',
    placeholder: 'Suddenly, something happened…',
    prompts: ['Suddenly, ', 'Oh no! '],
  },
  {
    key: 'end',
    title: 'End',
    emoji: '🎉',
    className: 'part-end',
    hint: 'How is the problem fixed? How does it end?',
    placeholder: 'In the end, they…',
    prompts: ['In the end, ', 'They all felt '],
  },
];

const WORLD_KEY = 'wordy-world-story-world';

function readWorld(): string {
  try {
    const stored = window.localStorage.getItem(WORLD_KEY);
    if (stored && getCategory(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'animals';
}

export function StoryCoach() {
  const [worldId, setWorldId] = useState<string>(readWorld);
  const world = getCategory(worldId) ?? categories[0];

  const [draft, setDraft] = useState<StoryDraft>(() => loadDraft(worldId));
  const [idea, setIdea] = useState<StoryIdea | null>(null);
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [busy, setBusy] = useState<'idea' | 'coach' | null>(null);
  const [notice, setNotice] = useState('');
  const [focusPart, setFocusPart] = useState<StoryPart>('beginning');
  const [online, setOnline] = useState<boolean | null>(null);
  const celebrated = useRef(false);

  const bankWords = useMemo(() => sample(world.words, 8), [world]);

  useEffect(() => {
    saveDraft(worldId, draft);
  }, [worldId, draft]);

  useEffect(() => {
    let live = true;
    checkCoach()
      .then((value) => {
        if (live) setOnline(value);
      })
      .catch(() => {
        if (live) setOnline(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const written = countWords(draft.beginning) + countWords(draft.middle) + countWords(draft.end);
  const filledParts = PARTS.filter((part) => countWords(draft[part.key]) >= 4).length;

  useEffect(() => {
    if (filledParts < PARTS.length) {
      celebrated.current = false;
      return;
    }
    if (reply && !celebrated.current) {
      celebrated.current = true;
      celebrate();
      sfx.win();
    }
  }, [filledParts, reply]);

  const chooseWorld = (id: string) => {
    if (id === worldId) return;
    saveDraft(worldId, draft);
    setWorldId(id);
    setDraft(loadDraft(id));
    setIdea(null);
    setReply(null);
    setNotice('');
    try {
      window.localStorage.setItem(WORLD_KEY, id);
    } catch {
      /* ignore */
    }
    sfx.tap();
  };

  const appendTo = (part: StoryPart, text: string) => {
    setFocusPart(part);
    setDraft((previous) => {
      const current = previous[part].trim();
      const next = `${current}${current ? ' ' : ''}${text}`.slice(0, 400);
      return { ...previous, [part]: next };
    });
  };

  const askCoach = async () => {
    if (busy) return;
    if (written < 4) {
      setNotice('Write a few words first, then ask Hoot. A whole sentence is perfect.');
      return;
    }
    setBusy('coach');
    setNotice('');
    try {
      const result = await askStory('coach', {
        world: world.name,
        words: sample(world.words, 6).map((entry) => entry.word),
        draft,
      });
      setReply(result);
      sfx.correct();
    } catch {
      setReply(localCoach(draft, bankWords.map((entry) => entry.word)));
      setNotice('Hoot’s online coach cannot be reached right now, so these are Hoot’s offline tips.');
      sfx.pop();
    } finally {
      setBusy(null);
    }
  };

  const askIdea = async () => {
    if (busy) return;
    setBusy('idea');
    setNotice('');
    try {
      const result = await askStory('idea', {
        world: world.name,
        words: sample(world.words, 6).map((entry) => entry.word),
        draft,
      });
      setIdea(result);
      sfx.pop();
    } catch {
      setIdea(localIdea(world.name, bankWords.map((entry) => entry.word)));
      setNotice('Ideas are coming from Hoot’s notebook today.');
    } finally {
      setBusy(null);
    }
  };

  const clearStory = () => {
    const hasText = Boolean(draft.beginning || draft.middle || draft.end || draft.title);
    if (hasText && !window.confirm('Start a brand new story? Your words will be cleared.')) return;
    setDraft(emptyDraft());
    setIdea(null);
    setReply(null);
    setNotice('');
    setFocusPart('beginning');
  };

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">New · Story coach</span>
        <h1>Story Studio</h1>
        <p>
          Pick a word world, plan a beginning, a middle and an end, then ask Hoot for help.
          Hoot will praise your writing, give one small tip and ask a question to keep you going.
        </p>
      </header>

      <div className="story-layout">
        <div className="story-main">
          <section className="panel">
            <h2>1. Choose your word world</h2>
            <p className="story-part-hint">Hoot will suggest words from this world.</p>
            <div className="story-worlds">
              {categories.map((category) => {
                const active = category.id === world.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    className={cx('story-world-chip', active && 'is-active')}
                    style={active ? { background: category.color } : undefined}
                    onClick={() => chooseWorld(category.id)}
                    aria-pressed={active}
                  >
                    <span aria-hidden="true">{category.emoji}</span>
                    {category.name}
                  </button>
                );
              })}
            </div>

            <h3 className="story-subhead">Words you could use</h3>
            <p className="story-part-hint">
              Tap a word to drop it into the part you are writing. {focusPart} is selected.
            </p>
            <div className="story-bank">
              {bankWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  className="story-word"
                  onClick={() => appendTo(focusPart, word.word)}
                >
                  <span aria-hidden="true">{word.emoji}</span>
                  <span>{word.word}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="story-parts" aria-label="Plan your story">
            {PARTS.map((part) => (
              <article key={part.key} className={cx('story-part', part.className)}>
                <div className="story-part-head">
                  <h3>
                    <span aria-hidden="true">{part.emoji}</span> {part.title}
                  </h3>
                  <span className="story-counter">{countWords(draft[part.key])} words</span>
                </div>
                <p className="story-part-hint">{part.hint}</p>
                <textarea
                  id={`story-${part.key}`}
                  aria-label={`${part.title} of your story`}
                  value={draft[part.key]}
                  maxLength={400}
                  placeholder={part.placeholder}
                  onFocus={() => setFocusPart(part.key)}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, [part.key]: event.target.value }))
                  }
                />
                <div className="story-chips">
                  {part.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="story-chip"
                      onClick={() => appendTo(part.key, prompt)}
                    >
                      {prompt.trim()}…
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <div className="story-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={askCoach}
              disabled={busy !== null}
              aria-busy={busy === 'coach'}
            >
              {busy === 'coach' ? '🦉 Hoot is thinking…' : '🦉 Ask the story coach'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={askIdea}
              disabled={busy !== null}
              aria-busy={busy === 'idea'}
            >
              {busy === 'idea' ? '✨ Thinking…' : '💡 Give me an idea'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={clearStory} disabled={busy !== null}>
              🧹 Start again
            </button>
            <span className="story-saved">💾 Saved in this browser</span>
          </div>

          {notice && <p className="story-notice">{notice}</p>}
        </div>

        <aside className="story-side">
          <section className="coach-card" aria-live="polite">
            <span className="eyebrow">Story coach</span>
            <h2>🦉 Hoot says</h2>

            <div className="story-power">
              <span>Story power</span>
              <span className="bar">
                <span style={{ width: `${Math.round((filledParts / PARTS.length) * 100)}%` }} />
              </span>
              <span>{'⭐'.repeat(filledParts)}</span>
            </div>

            {busy === 'coach' ? (
              <div className="coach-thinking" role="status" aria-label="Hoot is thinking">
                <span />
                <span />
                <span />
              </div>
            ) : reply ? (
              <>
                <div className="coach-line">
                  <span className="coach-line-emoji" aria-hidden="true">
                    👏
                  </span>
                  <div className="coach-line-body">
                    <span className="coach-line-label">What I liked</span>
                    <p className="coach-line-text">{reply.praise}</p>
                  </div>
                  <button
                    type="button"
                    className="coach-speak"
                    aria-label="Hear the praise"
                    onClick={() => speak(reply.praise)}
                  >
                    🔊
                  </button>
                </div>

                <div className="coach-line">
                  <span className="coach-line-emoji" aria-hidden="true">
                    💡
                  </span>
                  <div className="coach-line-body">
                    <span className="coach-line-label">One tip</span>
                    <p className="coach-line-text">{reply.tip}</p>
                  </div>
                  <button
                    type="button"
                    className="coach-speak"
                    aria-label="Hear the tip"
                    onClick={() => speak(reply.tip)}
                  >
                    🔊
                  </button>
                </div>

                <div className="coach-line">
                  <span className="coach-line-emoji" aria-hidden="true">
                    ❓
                  </span>
                  <div className="coach-line-body">
                    <span className="coach-line-label">Your turn</span>
                    <p className="coach-line-text">{reply.question}</p>
                  </div>
                  <button
                    type="button"
                    className="coach-speak"
                    aria-label="Hear the question"
                    onClick={() => speak(reply.question)}
                  >
                    🔊
                  </button>
                </div>

                {reply.nextSentence && (
                  <div className="coach-line">
                    <span className="coach-line-emoji" aria-hidden="true">
                      ✍️
                    </span>
                    <div className="coach-line-body">
                      <span className="coach-line-label">Try writing this</span>
                      <p className="coach-line-text">{reply.nextSentence}</p>
                      <button
                        type="button"
                        className="btn btn-light small coach-use"
                        onClick={() => appendTo(focusPart, reply.nextSentence)}
                      >
                        Add to {focusPart}
                      </button>
                    </div>
                  </div>
                )}

                <div className="coach-line">
                  <span className="coach-line-emoji" aria-hidden="true">
                    🧺
                  </span>
                  <div className="coach-line-body">
                    <span className="coach-line-label">Words to try</span>
                    <div className="coach-words">
                      {reply.words.map((word) => (
                        <button
                          key={word}
                          type="button"
                          className="coach-word"
                          onClick={() => appendTo(focusPart, word)}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-light small"
                  onClick={() => speak(`${reply.praise} ${reply.tip} ${reply.question}`)}
                >
                  🔊 Hear Hoot
                </button>
              </>
            ) : (
              <div className="coach-empty">
                <span className="coach-empty-owl" aria-hidden="true">
                  🦉
                </span>
                <p>
                  Write a sentence or two, then tap <strong>Ask the story coach</strong>. Hoot will
                  read your writing and help with the next part.
                </p>
              </div>
            )}
          </section>

          {idea && (
            <section className="coach-card" aria-live="polite">
              <span className="eyebrow">Story idea</span>
              <h2>✨ Try this one</h2>
              <div className="coach-line">
                <span className="coach-line-emoji" aria-hidden="true">
                  🧒
                </span>
                <div className="coach-line-body">
                  <span className="coach-line-label">Who</span>
                  <p className="coach-line-text">{idea.who}</p>
                </div>
              </div>
              <div className="coach-line">
                <span className="coach-line-emoji" aria-hidden="true">
                  📍
                </span>
                <div className="coach-line-body">
                  <span className="coach-line-label">Where</span>
                  <p className="coach-line-text">{idea.where}</p>
                </div>
              </div>
              <div className="coach-line">
                <span className="coach-line-emoji" aria-hidden="true">
                  ⚡
                </span>
                <div className="coach-line-body">
                  <span className="coach-line-label">Problem</span>
                  <p className="coach-line-text">{idea.problem}</p>
                </div>
              </div>
              <div className="coach-line">
                <span className="coach-line-emoji" aria-hidden="true">
                  🌈
                </span>
                <div className="coach-line-body">
                  <span className="coach-line-label">Surprise</span>
                  <p className="coach-line-text">{idea.magic}</p>
                </div>
              </div>
              <div className="coach-line">
                <span className="coach-line-emoji" aria-hidden="true">
                  ✨
                </span>
                <div className="coach-line-body">
                  <span className="coach-line-label">Opening sentence</span>
                  <p className="coach-line-text">{idea.starter}</p>
                  <button
                    type="button"
                    className="btn btn-light small coach-use"
                    onClick={() => appendTo('beginning', idea.starter)}
                  >
                    Use this start
                  </button>
                </div>
              </div>
              <div className="coach-words">
                {idea.words.map((word) => (
                  <button
                    key={word}
                    type="button"
                    className="coach-word"
                    onClick={() => appendTo(focusPart, word)}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <h2>👩‍🏫 For grown-ups</h2>
            <p>
              The story coach is an AI helper (OpenAI). Only the story text, the chosen word world
              and a few vocabulary words are sent to it to write a reply. Nothing is stored on the
              server, and no names or accounts are used. Please remind children not to type real
              names, addresses or other personal details.
            </p>
            {online === false && (
              <p className="story-notice">
                The online coach is not switched on for this site yet, so children see Hoot’s
                built-in offline tips instead.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
