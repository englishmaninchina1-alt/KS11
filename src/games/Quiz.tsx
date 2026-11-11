import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '../data';
import { GameFrame } from '../components/GameFrame';
import { GameResult } from '../components/GameResult';
import { celebrate } from '../lib/confetti';
import { recordGame } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { speak } from '../lib/speech';
import { sample, shuffle } from '../lib/utils';

const ROUNDS = 10;

type Question = {
  id: string;
  kind: 'picture' | 'meaning' | 'sound';
  word: Word;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  answer: string;
};

function makeQuestions(words: Word[]): Question[] {
  const picks = sample(words, ROUNDS);
  return picks.map((word, index) => {
    const kind: Question['kind'] = index % 3 === 0 ? 'picture' : index % 3 === 1 ? 'meaning' : 'sound';
    const others = sample(
      words.filter((candidate) => candidate.id !== word.id),
      3,
    );
    const optionPool = [word, ...others];

    if (kind === 'meaning') {
      return {
        id: `${word.id}-meaning`,
        kind,
        word,
        prompt: 'What does this word mean?',
        options: shuffle(
          optionPool.map((candidate) => ({ id: candidate.id, label: candidate.meaning })),
        ),
        answer: word.id,
      };
    }

    return {
      id: `${word.id}-${kind}`,
      kind,
      word,
      prompt: kind === 'picture' ? 'Which word matches the picture?' : 'Which word sounds like this?',
      options: shuffle(
        optionPool.map((candidate) => ({ id: candidate.id, label: candidate.word })),
      ),
      answer: word.id,
    };
  });
}

export function Quiz({ category }: { category: Category }) {
  const questions = useMemo(() => makeQuestions(category.words), [category]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoredRef = useRef(false);

  const question = questions[index];

  useEffect(() => {
    if (finished || !question || question.kind !== 'picture') return;
    const timer = window.setTimeout(() => speak(question.word.word), 350);
    return () => window.clearTimeout(timer);
  }, [question, finished]);

  useEffect(() => {
    if (!finished || scoredRef.current) return;
    scoredRef.current = true;
    const ratio = score / questions.length;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    recordGame('quiz', stars);
    celebrate(120);
    sfx.win();
  }, [finished, score, questions.length]);

  const choose = (optionId: string) => {
    if (picked || !question) return;
    setPicked(optionId);
    if (optionId === question.answer) {
      setScore((value) => value + 1);
      sfx.correct();
    } else {
      sfx.wrong();
    }

    window.setTimeout(() => {
      if (index + 1 >= questions.length) setFinished(true);
      else {
        setPicked(null);
        setIndex((value) => value + 1);
      }
    }, 1300);
  };

  const restart = () => {
    scoredRef.current = false;
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const ratio = score / questions.length;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;

  if (!question) {
    return (
      <GameFrame title="Quick Quiz" emoji="❓" category={category}>
        <div className="panel empty-state">
          <p>No questions here. Try another world.</p>
        </div>
      </GameFrame>
    );
  }

  return (
    <GameFrame
      title="Quick Quiz"
      emoji="❓"
      category={category}
      score={
        <>
          <span>✅ {score}</span>
          <span>❓ {Math.min(index + 1, questions.length)}/{questions.length}</span>
        </>
      }
      onRestart={restart}
    >
      {finished ? (
        <GameResult
          emoji="🏆"
          title="Quiz complete!"
          message={`You scored ${score} out of ${questions.length}.`}
          stars={stars}
          stats={[{ label: 'correct answers', value: `${score}/${questions.length}` }]}
          onReplay={restart}
        />
      ) : (
        <>
          <div className="quiz-progress">
            <div className="quiz-bar" aria-hidden="true">
              <span style={{ width: `${((index + (picked ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>
            <small>
              Question {index + 1} of {questions.length}
            </small>
          </div>

          <div className="quiz-card">
            <p className="quiz-prompt">{question.prompt}</p>

            {question.kind === 'picture' && (
              <>
                <div className="quiz-emoji" aria-hidden="true">
                  {question.word.emoji}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost small"
                  onClick={() => speak(question.word.word)}
                >
                  🔊 Hear the word
                </button>
              </>
            )}

            {question.kind === 'meaning' && (
              <div className="quiz-word">
                <span aria-hidden="true">{question.word.emoji}</span>
                <strong>{question.word.word}</strong>
                <small>{question.word.say}</small>
              </div>
            )}

            {question.kind === 'sound' && (
              <>
                <div className="quiz-respell">{question.word.say}</div>
                <button
                  type="button"
                  className="btn btn-ghost small"
                  onClick={() => speak(question.word.word)}
                >
                  🔊 Hear the word
                </button>
              </>
            )}
          </div>

          <div className="option-grid quiz-options">
            {question.options.map((option) => {
              const isRight = option.id === question.answer;
              const isPicked = picked === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={[
                    'option-card',
                    picked && isRight ? 'is-right' : '',
                    picked && isPicked && !isRight ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => choose(option.id)}
                  disabled={picked !== null}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </GameFrame>
  );
}
