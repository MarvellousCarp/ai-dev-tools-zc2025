import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  test: {
    typecheck: {
      tsconfig: './tsconfig.vitest.json'
    },
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    environmentMatchGlobs: [
      ['src/__tests__/integration/**', 'node']
    ]
  }
});
