import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Resolve the `@/` alias from tsconfig paths.
  resolve: { tsconfigPaths: true },
  // Read VITE_* vars from the root .env, like the backend does.
  envDir: '../..',
  server: { port: 5173 },
});
