import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { shuffle } from '../lib/utils';

const ROUNDS = 8;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Round = {
  word: Word;
  chars: string[];
  blankIndexes: number[];
  options: Record<number, string[]>;
};

type FilledState = {
  roundId: string;
  values: Record<number, string>;
};

function makeRound(word: Word): Round {
  const chars = word.word.toUpperCase().split('');
  const letterIndexes = chars
    .map((char, index) => (/[A-Z]/.test(char) ? index : -1))
    .filter((index) => index >= 0);

  const hideable = letterIndexes.slice(1);
  const hideCount = Math.min(
    hideable.length,
    letterIndexes.length <= 4 ? 1 : letterIndexes.length <= 7 ? 2 : 3,
  );
  const blankIndexes = shuffle(hideable)
    .slice(0, hideCount)
    .sort((a, b) => a - b);

  const options: Record<number, string[]> = {};
  blankIndexes.forEach((index) => {
    const answer = chars[index];
    const distractors = shuffle(ALPHABET.filter((letter) => letter !== answer)).slice(0, 2);
    options[index] = shuffle([answer, ...distractors]);
  });

  return { word, chars, blankIndexes, options };
}

export function Spelling({ category }: { category: Category }) {
  const rounds = useMemo(() => shuffle(category.words).slice(0, ROUNDS).map(makeRound), [category]);
  const [index, setIndex] = useState(0);
  const [filled, setFilled] = useState<FilledState>({ roundId: '', values: {} });
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [shake, setShake] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);

  const round = rounds[index];

  // Values are tagged with the round they belong to, so a new round can never
  // inherit the previous round's letters.
  const values = round && filled.roundId === round.word.id ? filled.values : {};
  const activeBlank = round?.blankIndexes.find((blank) => !values[blank]);

  const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    recordGame('spelling', stars);
    celebrate(120);
    sfx.win();
  }, [finished, stars]);

  const choose = (letter: string) => {
    if (!round || activeBlank === undefined) return;

    if (letter !== round.chars[activeBlank]) {
      setMistakes((value) => value + 1);
      setShake((value) => value + 1);
      sfx.wrong();
      return;
    }

    const nextValues = { ...values, [activeBlank]: letter };
    setFilled({ roundId: round.word.id, values: nextValues });
    sfx.correct();

    const isComplete = round.blankIndexes.every((blank) => nextValues[blank]);
    if (!isComplete) return;

    setSolved((value) => value + 1);
    window.setTimeout(() => {
      if (index + 1 >= rounds.length) setFinished(true);
      else setIndex((value) => value + 1);
    }, 1100);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setFilled({ roundId: '', values: {} });
    setMistakes(0);
    setSolved(0);
    setFinished(false);
    setShake(0);
  };

  if (!round) {
    return (
      <GameFrame title="Spelling Bee" emoji="🐝" category={category}>
        <div className="panel empty-state">
          <p>No words to spell here. Try another world.</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Spelling Bee"
      emoji="🐝"
      category={category}
      score={
        <>
          <span>🐝 {solved}/{rounds.length}</span>
          <span>❌ {mistakes}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🐝"
          title="Spelling superstar!"
          message={`You finished all ${rounds.length} words.`}
          stars={stars}
          stats={[
            { label: 'words', value: `${rounds.length}/${rounds.length}` },
            { label: 'wrong letters', value: mistakes },
          ]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className="game-hint">Fill in the missing letters to finish the word.</p>

          <div className="spell-stage">
            <span className="spell-emoji" aria-hidden="true">
              {round.word.emoji}
            </span>
            <button
              type="button"
              className="btn btn-ghost small"
              onClick={() => speak(round.word.word)}
            >
              🔊 Hear it
            </button>
            <p className="spell-meaning">{round.word.meaning}</p>
            <p className="spell-say">
              Say it like this: <strong>{round.word.say}</strong>
            </p>
          </div>

          <div className="spell-word" key={shake}>
            {round.chars.map((char, charIndex) => {
              if (char === ' ') return <span key={charIndex} className="spell-gap" />;
              if (!/[A-Z]/.test(char)) {
                return (
                  <span key={charIndex} className="spell-letter fixed">
                    {char}
                  </span>
                );
              }
              const isBlank = round.blankIndexes.includes(charIndex);
              const value = values[charIndex];
              return (
                <span
                  key={charIndex}
                  className={[
                    'spell-letter',
                    isBlank ? 'blank' : '',
                    isBlank && !value ? 'is-active' : '',
                    isBlank && value ? 'filled' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isBlank ? value ?? '?' : char}
                </span>
              );
            })}
          </div>

          <p className="spell-question">Which letter fills the next gap?</p>
          <div className="letter-options">
            {(activeBlank !== undefined ? round.options[activeBlank] : []).map((letter) => (
              <button
                key={letter}
                type="button"
                className="letter-tile"
                onClick={() => choose(letter)}
              >
                {letter}
              </button>
            ))}
          </div>

          <div className="round-dots" aria-hidden="true">
            {rounds.map((item, dotIndex) => (
              <span
                key={item.word.id}
                className={dotIndex === index ? 'is-now' : dotIndex < index ? 'is-done' : ''}
              />
            ))}
          </div>
        </>
      )}
    </GameFrame>
  );
}
