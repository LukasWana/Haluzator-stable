import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy media folder to dist if it exists
const mediaSource = join(__dirname, 'media');
const mediaDest = join(__dirname, 'dist', 'media');

if (existsSync(mediaSource)) {
  try {
    // Ensure dist directory exists
    const distDir = join(__dirname, 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    cpSync(mediaSource, mediaDest, { recursive: true, force: true });
    console.log('✓ Copied media folder to dist/');
  } catch (error) {
    console.warn('Failed to copy media folder:', error);
  }
} else {
  console.warn('Media folder not found at:', mediaSource);
}

