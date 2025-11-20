import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';

    // Security: Never expose API keys in production client bundle
    // API keys should only be used server-side or through a secure proxy
    if (isProduction && env.GEMINI_API_KEY) {
        console.warn('⚠️  WARNING: GEMINI_API_KEY is set but will NOT be included in production bundle for security.');
        console.warn('⚠️  If you need Gemini API functionality, use a backend proxy instead.');
    }

    const plugins = [react()];

    // Remove console.log in production builds
    if (isProduction) {
        plugins.push(removeConsole({ includes: ['log', 'warn', 'info', 'debug'] }));
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins,
      define: {
        // Only include API keys in development mode
        // In production, these should be undefined to prevent exposure
        'process.env.API_KEY': isProduction ? JSON.stringify(undefined) : JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': isProduction ? JSON.stringify(undefined) : JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.NODE_ENV': JSON.stringify(mode)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Enable minification
        minify: 'esbuild',
        // Generate source maps only in development
        sourcemap: !isProduction,
        // Chunk splitting strategy for better caching
        rollupOptions: {
          output: {
            manualChunks: {
              // Separate vendor chunks
              'react-vendor': ['react', 'react-dom'],
              'three-vendor': ['three'],
              'monaco-vendor': ['monaco-editor'],
            },
          },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Optimize asset handling
        assetsInlineLimit: 4096,
      },
    };
});
