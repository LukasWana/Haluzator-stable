import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import removeConsole from 'vite-plugin-remove-console';

const isElectron = process.env.ELECTRON === 'true';

export default defineConfig(({ mode }) => {
    const isProduction = mode === 'production';

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
        'process.env.NODE_ENV': JSON.stringify(mode),
        'process.env.ELECTRON': JSON.stringify(isElectron),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      base: isElectron ? './' : '/',
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
        // For Electron, ensure proper paths
        outDir: 'dist',
      },
    };
});
