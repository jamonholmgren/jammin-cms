import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';

// Copy static files after build
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    closeBundle() {
      // Ensure dist directory exists
      if (!existsSync('dist')) {
        mkdirSync('dist', { recursive: true });
      }

      // Copy manifest
      copyFileSync('manifest.json', 'dist/manifest.json');

      // Copy HTML files
      copyFileSync('src/popup/index.html', 'dist/popup.html');
      copyFileSync('src/options/index.html', 'dist/options.html');

      // Copy icons if they exist
      if (existsSync('icons')) {
        if (!existsSync('dist/icons')) {
          mkdirSync('dist/icons', { recursive: true });
        }
        ['icon16.png', 'icon48.png', 'icon128.png'].forEach((icon) => {
          if (existsSync(`icons/${icon}`)) {
            copyFileSync(`icons/${icon}`, `dist/icons/${icon}`);
          }
        });
      }
    },
  };
}

// Build config for Chrome extension - each entry is self-contained
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        options: resolve(__dirname, 'src/options/options.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        // Force all shared code into each entry (no chunks)
        manualChunks: {},
        chunkFileNames: '[name].js',
      },
    },
    sourcemap: false,
    minify: true,
    // Inline all assets
    assetsInlineLimit: 100000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [copyStaticFiles()],
});
