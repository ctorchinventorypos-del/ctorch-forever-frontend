import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server runs on http://localhost:5173 (which the backend CORS allows).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
