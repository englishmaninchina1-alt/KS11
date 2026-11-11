import { useSyncExternalStore } from 'react';

export type Student = { id: string; name: string };
export type AuthState = { student: Student | null; ready: boolean; configured: boolean };

export type AuthResult = { ok: true } | { ok: false; message: string };

let state: AuthState = { student: null, ready: false, configured: true };
const listeners = new Set<() => void>();
let started = false;

function publish(next: AuthState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): AuthState {
  return state;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

type ApiResponse = { ok: boolean; status: number; data: Record<string, unknown> };

async function call(path: string, init?: RequestInit): Promise<ApiResponse> {
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    // A Vite dev server (or any non-Worker host) answers /api/* with the HTML shell.
    if (!data || typeof data !== 'object') {
      return { ok: false, status: response.status, data: { error: 'unavailable' } };
    }
    return { ok: response.ok, status: response.status, data: data as Record<string, unknown> };
  } catch {
    return { ok: false, status: 0, data: { error: 'unavailable' } };
  }
}

function readStudent(data: Record<string, unknown>): Student | null {
  const student = data.student;
  if (!student || typeof student !== 'object') return null;
  const { id, name } = student as { id?: unknown; name?: unknown };
  if (typeof id !== 'string' || typeof name !== 'string') return null;
  return { id, name };
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const OFFLINE_MESSAGE =
  'Sign-in is not switched on here. It works on the live website: ks11.freebuff.page';

function messageFor(response: ApiResponse): string {
  const error = typeof response.data.error === 'string' ? response.data.error : '';
  if (error === 'unavailable') return OFFLINE_MESSAGE;
  if (error === 'not-configured') return OFFLINE_MESSAGE;
  const message = typeof response.data.message === 'string' ? response.data.message : '';
  return message || FALLBACK_MESSAGE;
}

/** Loads the signed-in student once per page load. Safe to call repeatedly. */
export async function loadAuth(): Promise<void> {
  if (started) return;
  started = true;
  const response = await call('/api/auth/me', { method: 'GET', headers: {} });
  const student = response.ok ? readStudent(response.data) : null;
  const configured = typeof response.data.error === 'string' ? response.data.error !== 'unavailable' && response.data.error !== 'not-configured' : true;
  publish({ student, ready: true, configured: configured && response.status !== 503 });
}

async function submit(path: string, name: string, password: string): Promise<AuthResult> {
  const response = await call(path, {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
  if (response.ok) {
    publish({ ...state, student: readStudent(response.data), ready: true, configured: true });
    return { ok: true };
  }
  return { ok: false, message: messageFor(response) };
}

export function registerStudent(name: string, password: string): Promise<AuthResult> {
  return submit('/api/auth/register', name, password);
}

export function signInStudent(name: string, password: string): Promise<AuthResult> {
  return submit('/api/auth/login', name, password);
}

export async function signOutStudent(): Promise<void> {
  await call('/api/auth/logout', { method: 'POST', body: '{}' });
  publish({ ...state, student: null, ready: true });
}
