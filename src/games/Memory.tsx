import { useEffect, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { sample, shuffle } from '../lib/utils';

type Card = {
  cardId: string;
  wordId: string;
  kind: 'word' | 'emoji';
  word: Word;
};

const PAIRS = 8;

function makeDeck(words: Word[]): Card[] {
  const picks = sample(words, PAIRS);
  const cards: Card[] = [];
  picks.forEach((word) => {
    cards.push({ cardId: `${word.id}-word`, wordId: word.id, kind: 'word', word });
    cards.push({ cardId: `${word.id}-emoji`, wordId: word.id, kind: 'emoji', word });
  });
  return shuffle(cards);
}

export function Memory({ category }: { category: Category }) {
  const [deck, setDeck] = useState<Card[]>(() => makeDeck(category.words));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const first = deck.find((card) => card.cardId === flipped[0]);
    const second = deck.find((card) => card.cardId === flipped[1]);
    if (!first || !second) return;

    setMoves((value) => value + 1);

    if (first.wordId === second.wordId) {
      const timer = window.setTimeout(() => {
        setMatched((previous) =>
          previous.includes(first.wordId) ? previous : [...previous, first.wordId],
        );
        setFlipped([]);
        sfx.correct();
      }, 420);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setFlipped([]);
      sfx.tap();
    }, 850);
    return () => window.clearTimeout(timer);
  }, [flipped, deck]);

  useEffect(() => {
    if (matched.length !== PAIRS || scoredRef.current) return;
    scoredRef.current = true;
    setFinished(true);
    const stars = moves <= PAIRS + 5 ? 3 : moves <= PAIRS * 2 ? 2 : 1;
    recordGame('memory', stars);
    celebrate(120);
    sfx.win();
  }, [matched, moves]);

  const stars = moves <= PAIRS + 5 ? 3 : moves <= PAIRS * 2 ? 2 : 1;

  const restart = () => {
    scoredRef.current = false;
    setDeck(makeDeck(category.words));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setFinished(false);
  };

  const flip = (card: Card) => {
    if (flipped.length >= 2) return;
    if (flipped.includes(card.cardId)) return;
    if (matched.includes(card.wordId)) return;
    setFlipped((previous) => [...previous, card.cardId]);
    sfx.tap();
  };

  return (
    <GameFrame
      title="Memory Pairs"
      emoji="🃏"
      category={category}
      score={
        <>
          <span>🃏 {matched.length}/{PAIRS}</span>
          <span>🔁 {moves} turns</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🧠"
          title="All pairs matched!"
          message={`You remembered every word in ${moves} turns.`}
          stars={stars}
          stats={[
            { label: 'pairs', value: `${PAIRS}/${PAIRS}` },
            { label: 'turns', value: moves },
          ]}
          onReplay={restart}
        />
      ) : (
        <>
          <p className="game-hint">
            Match each picture with its word. Fewer turns means more stars!
          </p>
          <div className="memory-grid">
            {deck.map((card) => {
              const isFaceUp = flipped.includes(card.cardId) || matched.includes(card.wordId);
              const isMatched = matched.includes(card.wordId);
              return (
                <button
                  key={card.cardId}
                  type="button"
                  className={[
                    'memory-card',
                    isFaceUp ? 'is-up' : '',
                    isMatched ? 'is-matched' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => flip(card)}
                  disabled={isMatched}
                  aria-label={isFaceUp ? `${card.word.word} card` : 'Hidden card'}
                >
                  {isFaceUp ? (
                    card.kind === 'emoji' ? (
                      <span className="memory-emoji" aria-hidden="true">
                        {card.word.emoji}
                      </span>
                    ) : (
                      <span className="memory-word">
                        <strong>{card.word.word}</strong>
                        <small>{card.word.say}</small>
                      </span>
                    )
                  ) : (
                    <span className="memory-back" aria-hidden="true">
                      🦉
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </GameFrame>
  );
}
