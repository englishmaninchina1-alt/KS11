import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { categories } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { pickOne, sample, shuffle } from '../lib/utils';

const ROUNDS = 10;

type Option = { word: Word; outsider: boolean; worldName: string };

type Round = {
  options: Option[];
  outsider: Word;
  worldName: string;
};

function makeRounds(category: Category): Round[] {
  const ownWords = new Set(category.words.map((word) => word.word.toLowerCase()));
  const candidates = categories
    .filter((other) => other.id !== category.id)
    .flatMap((other) =>
      other.words.map((word) => ({ word, worldName: other.name })),
    )
    .filter(({ word }) => !ownWords.has(word.word.toLowerCase()));

  return Array.from({ length: ROUNDS }, () => {
    const three = sample(category.words, 3).map<Option>((word) => ({
      word,
      outsider: false,
      worldName: category.name,
    }));
    const outsider = pickOne(candidates);
    return {
      options: shuffle<Option>([
        ...three,
        { word: outsider.word, outsider: true, worldName: outsider.worldName },
      ]),
      outsider: outsider.word,
      worldName: outsider.worldName,
    };
  });
}

export function OddOneOut({ category }: { category: Category }) {
  const rounds = useMemo(() => makeRounds(category), [category]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);

  const round = rounds[index];

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    const ratio = score / rounds.length;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    recordGame('oddone', stars);
    celebrate(120);
    sfx.win();
  }, [finished, score, rounds.length]);

  const choose = (word: Word, outsider: boolean) => {
    if (picked) return;
    setPicked(word.id);
    if (outsider) {
      setScore((value) => value + 1);
      sfx.correct();
    } else {
      sfx.wrong();
    }

    window.setTimeout(() => {
      if (index + 1 >= rounds.length) setFinished(true);
      else {
        setPicked(null);
        setIndex((value) => value + 1);
      }
    }, 1600);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const ratio = score / rounds.length;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;

  if (!round) {
    return (
      <GameFrame title="Odd One Out" emoji="🕵️" category={category}>
        <div className="panel empty-state">
          <p>Not enough words here. Try another world.</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Odd One Out"
      emoji="🕵️"
      category={category}
      score={
        <>
          <span>🕵️ {score}</span>
          <span>🔎 {Math.min(index + 1, rounds.length)}/{rounds.length}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🕵️"
          title="Case closed!"
          message={`You spotted ${score} out of ${rounds.length} strangers.`}
          stars={stars}
          stats={[{ label: 'correct', value: `${score}/${rounds.length}` }]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className="game-hint">
            Which word does <strong>not</strong> belong to {category.name}?
          </p>

          <div className="odd-grid">
            {round.options.map((option) => {
              const isPicked = picked === option.word.id;
              const showState = picked !== null;
              return (
                <button
                  key={`${option.word.id}-${option.outsider}`}
                  type="button"
                  className={[
                    'odd-card',
                    showState && option.outsider ? 'is-right' : '',
                    showState && isPicked && !option.outsider ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => choose(option.word, option.outsider)}
                  disabled={picked !== null}
                >
                  <span className="odd-emoji" aria-hidden="true">
                    {option.word.emoji}
                  </span>
                  <strong>{option.word.word}</strong>
                  <small>{option.word.say}</small>
                </button>
              );
            })}
          </div>

          {picked && (
            <p className="odd-feedback">
              {picked === round.outsider.id
                ? `Yes! “${round.outsider.word}” belongs to ${round.worldName}. 🎉`
                : `Oops - “${round.outsider.word}” is the stranger. It belongs to ${round.worldName}.`}
            </p>
          )}
        </>
      )}
    </GameFrame>
  );
}
