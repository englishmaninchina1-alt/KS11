const CONFETTI_COLOURS = [
  '#ffd166',
  '#ff6b6b',
  '#4ecdc4',
  '#a78bfa',
  '#38bdf8',
  '#f472b6',
  '#34d399',
  '#fbbf24',
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  colour: string;
  rotation: number;
  spin: number;
  life: number;
};

/** A short, self-cleaning confetti burst. Respects reduced-motion settings. */
export function celebrate(pieceCount = 110): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = Array.from({ length: pieceCount }, () => ({
    x: width * (0.15 + Math.random() * 0.7),
    y: height * (0.25 + Math.random() * 0.15),
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 11 - 3,
    size: 5 + Math.random() * 8,
    colour: CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.35,
    life: 1,
  }));

  const start = performance.now();
  const duration = 2200;

  function frame(now: number): void {
    if (!ctx) return;
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.vy += 0.32;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life = Math.max(0, 1 - elapsed / duration);

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.6);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (elapsed < duration) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(frame);
}
