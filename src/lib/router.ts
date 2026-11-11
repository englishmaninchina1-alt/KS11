import { useEffect, useState } from 'react';

function readHash(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw.length > 0 ? raw : '/';
}

export function useRoute(): string {
  const [route, setRoute] = useState<string>(readHash);

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(to: string): void {
  const next = to.startsWith('/') ? to : `/${to}`;
  if (window.location.hash.replace(/^#/, '') === next) return;
  window.location.hash = next;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export type RouteParts = string[];

export function parseRoute(route: string): RouteParts {
  return route.split('/').filter(Boolean);
}
