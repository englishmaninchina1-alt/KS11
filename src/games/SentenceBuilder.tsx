import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { shuffle } from '../lib/utils';

const ROUNDS = 6;

type Token = { id: number; text: string };
type PlacedState = { roundId: string; tokens: Token[] };

export function SentenceBuilder({ category }: { category: Category }) {
  const rounds = useMemo(
    () =>
      shuffle(category.words)
        .filter((word) => {
          const count = word.sentence.split(' ').length;
          return count >= 4 && count <= 8;
        })
        .slice(0, ROUNDS),
    [category],
  );

  const [index, setIndex] = useState(0);
  const [placedState, setPlacedState] = useState<PlacedState>({ roundId: '', tokens: [] });
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);

  const round = rounds[index];

  const tokens = useMemo<Token[]>(() => {
    if (!round) return [];
    return shuffle(round.sentence.split(' ').map((text, id) => ({ id, text })));
  }, [round]);

  const placed = round && placedState.roundId === round.id ? placedState.tokens : [];
  const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    recordGame('sentence', stars);
    celebrate(120);
    sfx.win();
  }, [finished, stars]);

  const setPlaced = (nextTokens: Token[]) => {
    if (!round) return;
    setPlacedState({ roundId: round.id, tokens: nextTokens });
  };

  const addToken = (token: Token) => {
    if (!round) return;
    if (placed.some((placedToken) => placedToken.id === token.id)) return;

    const next = [...placed, token];
    setPlaced(next);
    setFeedback('');
    sfx.tap();

    if (next.length !== tokens.length) return;

    const sentence = next.map((item) => item.text).join(' ');
    if (sentence === round.sentence) {
      setSolved((value) => value + 1);
      setFeedback('Perfect sentence! 🎉');
      sfx.correct();
      window.setTimeout(() => {
        if (index + 1 >= rounds.length) setFinished(true);
        else setIndex((value) => value + 1);
      }, 1200);
      return;
    }

    setMistakes((value) => value + 1);
    setFeedback('Not quite - let us try again. 🙈');
    setShake((value) => value + 1);
    sfx.wrong();
    window.setTimeout(() => {
      setPlaced([]);
      setFeedback('');
    }, 1100);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setPlacedState({ roundId: '', tokens: [] });
    setSolved(0);
    setMistakes(0);
    setShake(0);
    setFeedback('');
    setFinished(false);
  };

  if (!round) {
    return (
      <GameFrame title="Sentence Builder" emoji="🧱" category={category}>
        <div className="panel empty-state">
          <p>No sentences here yet. Try another world.</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Sentence Builder"
      emoji="🧱"
      category={category}
      score={
        <>
          <span>🧱 {solved}/{rounds.length}</span>
          <span>❌ {mistakes}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="📝"
          title="Sentence star!"
          message={`You built all ${rounds.length} sentences correctly.`}
          stars={stars}
          stats={[
            { label: 'sentences', value: `${rounds.length}/${rounds.length}` },
            { label: 'wrong tries', value: mistakes },
          ]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className="game-hint">Tap the words in the right order to build a sentence.</p>

          <div className="sentence-stage">
            <span className="scramble-emoji" aria-hidden="true">
              {round.emoji}
            </span>
            <p className="scramble-meaning">
              Build a sentence about <strong>{round.word}</strong>
            </p>
          </div>

          <div className={shake % 2 === 1 ? 'sentence-build shake' : 'sentence-build'} key={shake}>
            {placed.length === 0 ? (
              <span className="sentence-placeholder">Your sentence appears here…</span>
            ) : (
              placed.map((token, tokenIndex) => (
                <button
                  key={`${token.id}-${tokenIndex}`}
                  type="button"
                  className="sentence-word placed"
                  onClick={() => {
                    setPlaced(placed.slice(0, tokenIndex));
                    setFeedback('');
                    sfx.tap();
                  }}
                >
                  {token.text}
                </button>
              ))
            )}
          </div>

          {feedback && <p className="sentence-feedback">{feedback}</p>}

          <div className="sentence-bank">
            {tokens.map((token) => {
              const isUsed = placed.some((placedToken) => placedToken.id === token.id);
              return (
                <button
                  key={token.id}
                  type="button"
                  className={isUsed ? 'sentence-word used' : 'sentence-word'}
                  disabled={isUsed}
                  onClick={() => addToken(token)}
                >
                  {token.text}
                </button>
              );
            })}
          </div>

          <div className="round-dots" aria-hidden="true">
            {rounds.map((item, dotIndex) => (
              <span
                key={item.id}
                className={dotIndex === index ? 'is-now' : dotIndex < index ? 'is-done' : ''}
              />
            ))}
          </div>
        </>
      )}
    </GameFrame>
  );
}
