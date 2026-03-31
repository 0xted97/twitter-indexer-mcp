import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
  },
  resolve: {
    alias: {
      '../src/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
