import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { speak, speakSlow, speechSupported } from '../lib/speech';
import { sample, shuffle } from '../lib/utils';

const ROUNDS = 8;

function buildOptions(target: Word, pool: Word[]): Word[] {
  const used = new Set<string>([target.emoji, target.word.toLowerCase()]);
  const distractors: Word[] = [];

  for (const candidate of shuffle(pool)) {
    if (candidate.id === target.id) continue;
    if (used.has(candidate.emoji) || used.has(candidate.word.toLowerCase())) continue;
    used.add(candidate.emoji);
    used.add(candidate.word.toLowerCase());
    distractors.push(candidate);
    if (distractors.length === 3) break;
  }

  return shuffle([target, ...distractors]);
}

export function ListenChoose({ category }: { category: Category }) {
  const rounds = useMemo(() => sample(category.words, ROUNDS), [category]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);
  const advancingRef = useRef(false);

  const target = rounds[index];
  const options = useMemo(() => buildOptions(target, category.words), [target, category.words]);

  useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(() => speak(target.word), 400);
    return () => window.clearTimeout(timer);
  }, [target, finished]);

  useEffect(() => {
    return () => {
      advancingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    const ratio = correct / rounds.length;
    const stars = ratio >= 1 ? 3 : ratio >= 0.75 ? 2 : 1;
    recordGame('listen', stars);
    celebrate(110);
    sfx.win();
  }, [finished, correct, rounds.length]);

  const choose = (word: Word) => {
    if (picked) return;
    setPicked(word.id);
    if (word.id === target.id) {
      setCorrect((value) => value + 1);
      sfx.correct();
    } else {
      sfx.wrong();
    }

    window.setTimeout(() => {
      if (index + 1 >= rounds.length) {
        setFinished(true);
      } else {
        setPicked(null);
        setIndex((value) => value + 1);
      }
    }, 1100);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  };

  const ratio = correct / rounds.length;
  const stars = ratio >= 1 ? 3 : ratio >= 0.75 ? 2 : 1;

  return (
    <GameFrame
      title="Listen & Choose"
      emoji="👂"
      category={category}
      score={
        <>
          <span>✅ {correct}</span>
          <span>🎯 {Math.min(index + (picked ? 1 : 0), rounds.length)}/{rounds.length}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="👂"
          title="Listening star!"
          message={`You understood ${correct} of ${rounds.length} words.`}
          stars={stars}
          stats={[
            { label: 'correct', value: `${correct}/${rounds.length}` },
          ]}
          onReplay={restart}
        />
      ) : (
        <>
          <div className="listen-stage">
            <p className="game-hint">Listen carefully, then tap the matching picture.</p>
            <div className="speaker-wrap">
              <button
                type="button"
                className="speaker-btn"
                onClick={() => speak(target.word)}
                aria-label={`Play the word again`}
              >
                🔊
              </button>
              <button
                type="button"
                className="btn btn-ghost small"
                onClick={() => speakSlow(target.word)}
              >
                🐢 Say it slowly
              </button>
            </div>
            {!speechSupported() && <p className="warning">This browser cannot speak the words.</p>}
          </div>

          <div className="option-grid">
            {options.map((option) => {
              const isPicked = picked === option.id;
              const isRight = option.id === target.id;
              const showState = picked !== null;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    'option-card',
                    showState && isRight ? 'is-right' : '',
                    showState && isPicked && !isRight ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => choose(option)}
                  disabled={picked !== null}
                >
                  <span className="option-emoji" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="option-word">{option.word}</span>
                  <span className="option-say">{option.say}</span>
                </button>
              );
            })}
          </div>

          <div className="round-dots" aria-hidden="true">
            {rounds.map((round, dotIndex) => (
              <span
                key={round.id}
                className={dotIndex === index ? 'is-now' : dotIndex < index ? 'is-done' : ''}
              />
            ))}
          </div>
        </>
      )}
    </GameFrame>
  );
}
