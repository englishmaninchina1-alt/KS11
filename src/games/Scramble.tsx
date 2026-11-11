import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { lettersOnly, shuffle, tileLetters } from '../lib/utils';

const ROUNDS = 7;

type PlacedState = { roundId: string; indexes: number[] };

export function Scramble({ category }: { category: Category }) {
  const rounds = useMemo(
    () =>
      shuffle(category.words)
        .filter((word) => {
          const length = lettersOnly(word.word).length;
          return length >= 3 && length <= 10;
        })
        .slice(0, ROUNDS),
    [category],
  );

  const [index, setIndex] = useState(0);
  const [placedState, setPlacedState] = useState<PlacedState>({ roundId: '', indexes: [] });
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [shake, setShake] = useState(0);
  const scoredRef = useRef(false);

  const round = rounds[index];

  // Fresh, shuffled tiles per round. Tiles belong to the round, not to state,
  // so a new word can never show leftover letters.
  const tiles = useMemo(() => {
    if (!round) return [];
    const base = tileLetters(round.word);
    let shuffled = shuffle(base);
    if (shuffled.join('') === base.join('') && base.length > 1) {
      shuffled = [...shuffled].reverse();
    }
    return shuffled;
  }, [round]);

  const placed = round && placedState.roundId === round.id ? placedState.indexes : [];
  const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    recordGame('scramble', stars);
    celebrate(120);
    sfx.win();
  }, [finished, stars]);

  const setPlaced = (indexes: number[]) => {
    if (!round) return;
    setPlacedState({ roundId: round.id, indexes });
  };

  const advance = () => {
    window.setTimeout(() => {
      if (index + 1 >= rounds.length) setFinished(true);
      else setIndex((value) => value + 1);
    }, 1000);
  };

  const placeTile = (tileIndex: number) => {
    if (!round || placed.includes(tileIndex)) return;
    const next = [...placed, tileIndex];
    setPlaced(next);
    sfx.tap();

    if (next.length !== tiles.length) return;

    const answer = next.map((position) => tiles[position]).join('');
    if (answer === lettersOnly(round.word)) {
      setSolved((value) => value + 1);
      sfx.correct();
      advance();
      return;
    }

    setMistakes((value) => value + 1);
    setShake((value) => value + 1);
    sfx.wrong();
    window.setTimeout(() => setPlaced([]), 750);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setPlacedState({ roundId: '', indexes: [] });
    setSolved(0);
    setMistakes(0);
    setFinished(false);
    setShake(0);
  };

  if (!round) {
    return (
      <GameFrame title="Word Scramble" emoji="🧩" category={category}>
        <div className="panel empty-state">
          <p>No words to scramble here. Try another world.</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Word Scramble"
      emoji="🧩"
      category={category}
      score={
        <>
          <span>🧩 {solved}/{rounds.length}</span>
          <span>❌ {mistakes}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🧩"
          title="Unscrambled!"
          message={`You rebuilt all ${rounds.length} words.`}
          stars={stars}
          stats={[
            { label: 'words', value: `${rounds.length}/${rounds.length}` },
            { label: 'wrong tries', value: mistakes },
          ]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className="game-hint">Tap the letters in the right order to build the word.</p>

          <div className="scramble-stage">
            <span className="scramble-emoji" aria-hidden="true">
              {round.emoji}
            </span>
            <div>
              <p className="scramble-meaning">{round.meaning}</p>
              <p className="spell-say">
                Say it like this: <strong>{round.say}</strong>
              </p>
              <button
                type="button"
                className="btn btn-ghost small"
                onClick={() => speak(round.word)}
              >
                🔊 Hear it
              </button>
            </div>
          </div>

          <div className="scramble-slots" key={shake}>
            {tiles.map((_, slotIndex) => {
              const tileIndex = placed[slotIndex];
              return (
                <span key={slotIndex} className={tileIndex === undefined ? 'slot empty' : 'slot'}>
                  {tileIndex === undefined ? '' : tiles[tileIndex]}
                </span>
              );
            })}
          </div>

          <div className="scramble-tiles">
            {tiles.map((letter, tileIndex) => {
              const isUsed = placed.includes(tileIndex);
              return (
                <button
                  key={`${letter}-${tileIndex}`}
                  type="button"
                  className={isUsed ? 'letter-tile used' : 'letter-tile'}
                  disabled={isUsed}
                  onClick={() => placeTile(tileIndex)}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          <div className="scramble-actions">
            <button
              type="button"
              className="btn btn-ghost small"
              onClick={() => {
                setPlaced(placed.slice(0, -1));
                sfx.tap();
              }}
              disabled={placed.length === 0}
            >
              ↩️ Undo
            </button>
            <button
              type="button"
              className="btn btn-ghost small"
              onClick={() => {
                setPlaced([]);
                sfx.tap();
              }}
              disabled={placed.length === 0}
            >
              🧹 Clear
            </button>
          </div>
        </>
      )}
    </GameFrame>
  );
}
