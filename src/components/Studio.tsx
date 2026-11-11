import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category, Word } from '../data';
import { syllables } from '../data';
import { celebrate } from '../lib/confetti';
import { markLearned, useProgress } from '../lib/progress';
import { sfx } from '../lib/sfx';
import { speak, speakCheer, speakSlow, speechSupported } from '../lib/speech';
import { cx } from '../lib/utils';

type RecorderState = 'idle' | 'asking' | 'recording' | 'ready' | 'denied' | 'unsupported';

type StudioProps = {
  word: Word;
  category: Category;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function highlightSentence(sentence: string, word: string): Array<{ text: string; hit: boolean }> {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`, 'gi'));
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, hit: part.toLowerCase() === word.toLowerCase() }));
}

export function Studio({ word, category, index, total, onClose, onPrev, onNext }: StudioProps) {
  const progress = useProgress();
  const learned = Boolean(progress.learned[word.id]);

  const [recorderState, setRecorderState] = useState<RecorderState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }, [clearTimer]);

  // Reset the recorder whenever we move to another word.
  useEffect(() => {
    clearTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecorderState('idle');
    setSeconds(0);
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
  }, [word.id, clearTimer]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onNext();
      if (event.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimer]);

  useEffect(() => {
    if (recorderState !== 'recording') return;
    timerRef.current = window.setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= 10) {
          stopRecording();
          return 10;
        }
        return value + 1;
      });
    }, 1000);
    return clearTimer;
  }, [recorderState, stopRecording, clearTimer]);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecorderState('unsupported');
      return;
    }
    setRecorderState('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size > 0) {
          setAudioUrl((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return URL.createObjectURL(blob);
          });
          setRecorderState('ready');
        } else {
          setRecorderState('idle');
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setSeconds(0);
      setRecorderState('recording');
      sfx.pop();
    } catch {
      setRecorderState('denied');
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function markSaidIt() {
    markLearned(word.id);
    celebrate(90);
    sfx.win();
    speakCheer('Well done!');
  }

  function sayWord(slow: boolean) {
    if (slow) speakSlow(word.word);
    else speak(word.word);
  }

  const pieces = highlightSentence(word.sentence, word.word);
  const parts = syllables(word.say);

  // Rendered into <body>: the page animates with a transform, and a transformed
  // ancestor would otherwise trap this fixed overlay inside the scrolling page.
  return createPortal(
    <div className="studio-backdrop" role="dialog" aria-modal="true" aria-labelledby="studio-title">
      <div className={cx('studio', `tint-${category.id}`)}>
        <div className="studio-top">
          <span className="studio-cat">
            {category.emoji} {category.name} · {index + 1} of {total}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close word card">
            ✕
          </button>
        </div>

        <div className="studio-hero">
          <div className="studio-emoji" aria-hidden="true">
            {word.emoji}
          </div>
          <div>
            <h2 id="studio-title" className="studio-word">
              {word.word}
            </h2>
            <div className="respell" aria-label={`Say it as ${parts.join(' ')}`}>
              {parts.map((part, partIndex) => (
                <span
                  key={`${part}-${partIndex}`}
                  className={cx('respell-part', part === part.toUpperCase() && part.length > 1 && 'is-stressed')}
                >
                  {part}
                </span>
              ))}
            </div>
            <p className="studio-meaning">{word.meaning}</p>
          </div>
        </div>

        <div className="studio-listen">
          <button type="button" className="btn btn-primary big" onClick={() => sayWord(false)}>
            🔊 Listen
          </button>
          <button type="button" className="btn btn-ghost big" onClick={() => sayWord(true)}>
            🐢 Slow
          </button>
          <button
            type="button"
            className="btn btn-ghost big"
            onClick={() => {
              sayWord(false);
            }}
            aria-label="Say the word again"
          >
            🔁 Again
          </button>
          {!speechSupported() && <span className="hint">Audio needs a modern browser.</span>}
        </div>

        <div className="studio-sentence">
          {pieces.map((piece, pieceIndex) =>
            piece.hit ? (
              <mark key={pieceIndex}>{piece.text}</mark>
            ) : (
              <span key={pieceIndex}>{piece.text}</span>
            ),
          )}
        </div>

        <div className="record-card">
          <h3>🎤 Your turn to say it</h3>
          <p className="hint">
            Listen first, then record yourself. Play it back and compare with the owl.
          </p>

          <div className="record-actions">
            {recorderState === 'recording' ? (
              <button type="button" className="btn btn-danger big recording" onClick={stopRecording}>
                ⏹ Stop ({10 - seconds}s)
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary big"
                onClick={startRecording}
                disabled={recorderState === 'asking'}
              >
                {recorderState === 'asking' ? '🎤 Asking…' : '🎤 Record'}
              </button>
            )}

            {audioUrl && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost big"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      audio.currentTime = 0;
                      void audio.play();
                    }
                  }}
                >
                  ▶️ My voice
                </button>
                <audio ref={audioRef} src={audioUrl} preload="metadata" hidden />
              </>
            )}
          </div>

          {recorderState === 'denied' && (
            <p className="warning">
              Microphone blocked. You can still listen and repeat out loud - ask a grown-up to allow
              the microphone if you want to record.
            </p>
          )}
          {recorderState === 'unsupported' && (
            <p className="warning">This browser cannot record. Try Chrome, Edge or Safari.</p>
          )}
          {audioUrl && (
            <p className="hint">
              Does your voice sound like the owl? If you are happy, tap the star below.
            </p>
          )}
        </div>

        <div className="studio-footer">
          <button type="button" className="btn btn-ghost" onClick={onPrev} aria-label="Previous word">
            ← Previous
          </button>
          <button
            type="button"
            className={cx('btn', 'btn-star', learned && 'is-done')}
            onClick={markSaidIt}
            disabled={learned}
          >
            {learned ? '⭐ Word learned' : '⭐ I said it!'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onNext} aria-label="Next word">
            Next →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
