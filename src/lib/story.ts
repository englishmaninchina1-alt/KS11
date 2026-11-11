/**
 * Story Studio helpers.
 *
 * The coach itself lives on the server (POST /api/story) so the OpenAI key never
 * reaches the browser. If the network, the key or the API is unavailable, the page
 * falls back to the friendly offline tips below so a child can still write a story.
 */
import { pickOne, sample } from './utils';

export type StoryPart = 'beginning' | 'middle' | 'end';

export type StoryDraft = {
  title: string;
  beginning: string;
  middle: string;
  end: string;
};

export type StoryIdea = {
  who: string;
  where: string;
  problem: string;
  magic: string;
  starter: string;
  words: string[];
};

export type CoachReply = {
  praise: string;
  tip: string;
  question: string;
  nextSentence: string;
  words: string[];
};

type StoryRequest = {
  world: string;
  words: string[];
  draft: StoryDraft;
};

const DRAFT_KEY = 'wordy-world-story-drafts-v1';

export function emptyDraft(): StoryDraft {
  return { title: '', beginning: '', middle: '', end: '' };
}

function readAll(): Record<string, Partial<StoryDraft>> {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<StoryDraft>>;
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function loadDraft(worldId: string): StoryDraft {
  const stored = readAll()[worldId];
  return { ...emptyDraft(), ...(stored ?? {}) };
}

export function saveDraft(worldId: string, draft: StoryDraft): void {
  try {
    const all = readAll();
    all[worldId] = draft;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch {
    /* Private browsing can block storage; the story still works in memory. */
  }
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Is the coach switch on for this deployment? */
export async function checkCoach(): Promise<boolean> {
  try {
    const response = await fetch('/api/story', { headers: { accept: 'application/json' } });
    if (!response.ok) return false;
    const data = (await response.json()) as { configured?: boolean };
    return Boolean(data.configured);
  } catch {
    return false;
  }
}

export async function askStory(action: 'coach', payload: StoryRequest): Promise<CoachReply>;
export async function askStory(action: 'idea', payload: StoryRequest): Promise<StoryIdea>;
export async function askStory(
  action: 'coach' | 'idea',
  payload: StoryRequest,
): Promise<CoachReply | StoryIdea> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch('/api/story', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`coach-${response.status}`);
    const data = (await response.json()) as { reply?: CoachReply; idea?: StoryIdea };
    const result = action === 'coach' ? data.reply : data.idea;
    if (!result) throw new Error('coach-empty');
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ offline kit */

const OFFLINE_TIPS: Record<StoryPart, string> = {
  beginning: 'Tell us who is in the story and where they are.',
  middle: 'Something should go wrong. What is the problem?',
  end: 'Say how the problem is fixed and how everyone feels.',
};

const OFFLINE_QUESTIONS: Record<StoryPart, string> = {
  beginning: 'Who is in your story, and where are they?',
  middle: 'Oh no! What goes wrong for them?',
  end: 'How does your story end? Are they happy?',
};

const OFFLINE_STARTERS: Record<StoryPart, string> = {
  beginning: 'One sunny morning, a little fox found something strange.',
  middle: 'Suddenly, the wind blew the door shut!',
  end: 'In the end, everyone laughed and shared the cake.',
};

const OFFLINE_IDS = [
  'a clever little mouse',
  'a sleepy cat called Sam',
  'a curious robot',
  'a tiny dragon',
  'a friendly fox',
  'a brave girl called Mia',
];

const OFFLINE_WHERES = [
  'a sunny garden',
  'a busy market',
  'a cosy kitchen',
  'a magic forest',
  'a noisy classroom',
  'a big red bus',
];

const OFFLINE_PROBLEMS = [
  'their favourite toy goes missing',
  'the rain will not stop',
  'a door is locked and nobody has the key',
  'they cannot find their way home',
  'a big puddle blocks the path',
];

const OFFLINE_MAGIC = [
  'a kind bird shows them a secret way',
  'a friendly giant lifts them over',
  'the rain stops and a rainbow appears',
  'a little dog digs up the lost key',
  'the moon lights up the path',
];

const OFFLINE_STARTS = [
  'One morning, Sam the cat found a shiny key under the bed.',
  'Deep in the green forest, a little fox heard a funny noise.',
  'Mia opened the big red door and gasped.',
  'The rain fell and fell. Splash, splash, splash!',
  'A tiny dragon landed on the school roof.',
];

export function localCoach(draft: StoryDraft, words: string[]): CoachReply {
  const total = countWords(draft.beginning) + countWords(draft.middle) + countWords(draft.end);
  const missing = (['beginning', 'middle', 'end'] as StoryPart[]).find(
    (part) => countWords(draft[part]) < 4,
  );

  const praise =
    total === 0
      ? 'Your story page is ready. Well done for starting!'
      : total < 10
        ? `You have written ${total} words. That is a super start!`
        : `You have written ${total} words. That is a real story!`;

  return {
    praise,
    tip: missing ? OFFLINE_TIPS[missing] : 'Add a feeling word, like happy, worried or proud.',
    question: missing ? OFFLINE_QUESTIONS[missing] : 'Can you write one more sentence about the end?',
    nextSentence: missing ? OFFLINE_STARTERS[missing] : OFFLINE_STARTERS.end,
    words: sample(words, 3),
  };
}

export function localIdea(worldName: string, words: string[]): StoryIdea {
  return {
    who: pickOne(OFFLINE_IDS),
    where: pickOne(OFFLINE_WHERES),
    problem: pickOne(OFFLINE_PROBLEMS),
    magic: pickOne(OFFLINE_MAGIC),
    starter: `${pickOne(OFFLINE_STARTS)} (This story lives in the ${worldName} word world.)`,
    words: sample(words, 3),
  };
}
