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

// Copy projection.html to dist-electron if it exists
const projectionSource = join(__dirname, 'electron', 'projection.html');
const projectionDest = join(__dirname, 'dist-electron', 'projection.html');
if (existsSync(projectionSource)) {
  try {
    cpSync(projectionSource, projectionDest);
    console.log('Copied projection.html to dist-electron/');
  } catch (error) {
    console.warn('Failed to copy projection.html:', error);
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

