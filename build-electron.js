import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cpSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy media folder to dist if it exists
const mediaSource = join(__dirname, 'media');
const mediaDest = join(__dirname, 'dist', 'media');
if (existsSync(mediaSource)) {
  try {
    cpSync(mediaSource, mediaDest, { recursive: true });
    console.log('Copied media folder to dist/');
  } catch (error) {
    console.warn('Failed to copy media folder:', error);
  }
}

build({
  entryPoints: [
    join(__dirname, 'electron/main.ts'),
    join(__dirname, 'electron/preload.ts'),
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: join(__dirname, 'dist-electron'),
  external: ['electron'],
  sourcemap: true,
}).catch(() => process.exit(1));

