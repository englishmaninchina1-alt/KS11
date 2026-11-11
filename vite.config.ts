import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PREVIEW_HOST is supplied per-process by the cloud preview environment so the
// dev server accepts that hostname without hard-coding it into the repo.
const previewHost = process.env.PREVIEW_HOST;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: previewHost ? [previewHost, 'localhost', '127.0.0.1'] : undefined,
  },
});
