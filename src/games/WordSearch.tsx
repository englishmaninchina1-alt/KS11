import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { lettersOnly, shuffle } from '../lib/utils';

const SIZE = 14;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

type Cell = { r: number; c: number };
type Placement = { word: string; cells: Cell[] };

type Puzzle = {
  grid: string[][];
  placements: Placement[];
};

function buildPuzzle(source: Word[]): Puzzle | null {
  const candidates = source.filter((word) => {
    const length = lettersOnly(word.word).length;
    return length >= 3 && length <= 11;
  });
  if (candidates.length < 6) return null;

  const pool = candidates.map((word) => lettersOnly(word.word));
  const filler = pool.join('');

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const grid: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(''));
    const placements: Placement[] = [];
    let allPlaced = true;

    for (const word of shuffle(candidates).slice(0, 8)) {
      const letters = lettersOnly(word.word);
      let placed = false;

      for (let tries = 0; tries < 500 && !placed; tries += 1) {
        const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const startRow = Math.floor(Math.random() * SIZE);
        const startCol = Math.floor(Math.random() * SIZE);
        const cells: Cell[] = [];
        let fits = true;

        for (let i = 0; i < letters.length; i += 1) {
          const r = startRow + direction[0] * i;
          const c = startCol + direction[1] * i;
          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
            fits = false;
            break;
          }
          const existing = grid[r][c];
          if (existing && existing !== letters[i]) {
            fits = false;
            break;
          }
          cells.push({ r, c });
        }

        if (!fits) continue;
        cells.forEach((cell, index) => {
          grid[cell.r][cell.c] = letters[index];
        });
        placements.push({ word: letters, cells });
        placed = true;
      }

      if (!placed) {
        allPlaced = false;
        break;
      }
    }

    if (!allPlaced) continue;

    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (!grid[r][c]) {
          grid[r][c] = filler[Math.floor(Math.random() * filler.length)];
        }
      }
    }

    return { grid, placements };
  }

  return null;
}

function lineCells(start: Cell, end: Cell): Cell[] | null {
  const dr = Math.sign(end.r - start.r);
  const dc = Math.sign(end.c - start.c);
  if (dr === 0 && dc === 0) return [start];
  const straight = dr === 0 || dc === 0 || Math.abs(end.r - start.r) === Math.abs(end.c - start.c);
  if (!straight) return null;
  const length = Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c)) + 1;
  return Array.from({ length }, (_, index) => ({
    r: start.r + dr * index,
    c: start.c + dc * index,
  }));
}

function cellAtPoint(x: number, y: number): Cell | null {
  const element = document.elementFromPoint(x, y) as HTMLElement | null;
  const cell = element?.closest('[data-r]') as HTMLElement | null;
  if (!cell) return null;
  return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
}

export function WordSearch({ category }: { category: Category }) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => buildPuzzle(category.words));
  const [found, setFound] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<Cell | null>(null);
  const [end, setEnd] = useState<Cell | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);

  const startRef = useRef<Cell | null>(null);
  const endRef = useRef<Cell | null>(null);
  const scoredRef = useRef(false);

  const placements = puzzle?.placements ?? [];
  const allFound = placements.length > 0 && found.length === placements.length;

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  const finishSelection = useCallback(() => {
    const first = startRef.current;
    const last = endRef.current;
    startRef.current = null;
    endRef.current = null;
    setStart(null);
    setEnd(null);

    if (!first || !last || !puzzle) return;
    const cells = lineCells(first, last);
    if (!cells || cells.length < 3) return;

    const text = cells.map((cell) => puzzle.grid[cell.r][cell.c]).join('');
    const reversed = [...text].reverse().join('');
    const match = puzzle.placements.find(
      (placement) => !found.includes(placement.word) && (placement.word === text || placement.word === reversed),
    );

    if (match) {
      setFound((previous) => (previous.includes(match.word) ? previous : [...previous, match.word]));
      sfx.correct();
    } else {
      setMistakes((value) => value + 1);
      sfx.wrong();
    }
  }, [puzzle, found]);

  useEffect(() => {
    if (!selecting) return;
    const move = (event: PointerEvent) => {
      const cell = cellAtPoint(event.clientX, event.clientY);
      if (cell) {
        endRef.current = cell;
        setEnd(cell);
      }
    };
    const up = () => {
      setSelecting(false);
      finishSelection();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [selecting, finishSelection]);

  useEffect(() => {
    if (!allFound || scoredRef.current) return;
    scoredRef.current = true;
    setFinished(true);
    const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
    recordGame('wordsearch', stars);
    celebrate(140);
    sfx.win();
  }, [allFound, mistakes]);

  const selectedKeys = useMemo(() => {
    if (!start) return new Set<string>();
    const cells = end ? lineCells(start, end) ?? [start] : [start];
    return new Set(cells.map((cell) => `${cell.r}-${cell.c}`));
  }, [start, end]);

  const foundCellMap = useMemo(() => {
    const map = new Map<string, number>();
    placements.forEach((placement, index) => {
      if (!found.includes(placement.word)) return;
      placement.cells.forEach((cell) => map.set(`${cell.r}-${cell.c}`, index));
    });
    return map;
  }, [placements, found]);

  const restart = () => {
    scoredRef.current = false;
    setPuzzle(buildPuzzle(category.words));
    setFound([]);
    setMistakes(0);
    setSeconds(0);
    setFinished(false);
    setStart(null);
    setEnd(null);
  };

  const stars = mistakes === 0 ? 3 : mistakes <= 3 ? 2 : 1;
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  if (!puzzle) {
    return (
      <GameFrame title="Word Search" emoji="🔍" category={category}>
        <div className="panel empty-state">
          <p>This world is too tricky for a word search. Try another world!</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Word Search"
      emoji="🔍"
      category={category}
      score={
        <>
          <span>🔍 {found.length}/{placements.length}</span>
          <span>⏱ {minutes}:{secs}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🎉"
          title="Puzzle solved!"
          message={`You found all ${placements.length} words. Beautiful searching!`}
          stars={stars}
          stats={[
            { label: 'words found', value: `${found.length}/${placements.length}` },
            { label: 'wrong tries', value: mistakes },
            { label: 'time', value: `${minutes}:${secs}` },
          ]}
          onReplay={restart}
        />
      ) : (
        <div className="ws-layout">
          <div
            className="ws-grid"
            role="grid"
            aria-label="Word search grid"
            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
            onPointerDown={(event) => {
              const cell = cellAtPoint(event.clientX, event.clientY);
              if (!cell) return;
              event.preventDefault();
              startRef.current = cell;
              endRef.current = cell;
              setStart(cell);
              setEnd(cell);
              setSelecting(true);
              sfx.tap();
            }}
          >
            {puzzle.grid.map((row, r) =>
              row.map((letter, c) => {
                const key = `${r}-${c}`;
                const foundIndex = foundCellMap.get(key);
                return (
                  <span
                    key={key}
                    data-r={r}
                    data-c={c}
                    className={[
                      'ws-cell',
                      selectedKeys.has(key) ? 'is-selected' : '',
                      foundIndex !== undefined ? `is-found found-${foundIndex % 8}` : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="gridcell"
                    aria-label={`Row ${r + 1} column ${c + 1}: ${letter}`}
                  >
                    {letter}
                  </span>
                );
              }),
            )}
          </div>

          <aside className="ws-side">
            <h3>Find these words</h3>
            <p className="hint">Drag across the letters, or tap the first letter then the last.</p>
            <ul className="ws-words">
              {placements.map((placement, index) => {
                const source = category.words.find((word) => lettersOnly(word.word) === placement.word);
                const isFound = found.includes(placement.word);
                return (
                  <li
                    key={placement.word}
                    className={isFound ? `is-found found-${index % 8}` : undefined}
                  >
                    <span aria-hidden="true">{isFound ? '✅' : '⬜'}</span>
                    <span className="ws-word-text">{source?.word ?? placement.word.toLowerCase()}</span>
                    <small>{placement.word.length} letters</small>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </GameFrame>
  );
}
