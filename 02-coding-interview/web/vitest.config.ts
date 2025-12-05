import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
