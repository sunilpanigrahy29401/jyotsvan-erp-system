import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Only VITE_-prefixed variables may reach the browser bundle. Never add INSFORGE_ / DATABASE / SERVICE_ROLE here.
    envPrefix: ['VITE_'],
    define: {
      'process.env.INSFORGE_API_URL': JSON.stringify(env.VITE_INSFORGE_API_URL || ''),
      'process.env.INSFORGE_ANON_KEY': JSON.stringify(env.VITE_INSFORGE_ANON_KEY || ''),
      'process.env.INSFORGE_PROJECT_ID': JSON.stringify(env.VITE_INSFORGE_PROJECT_ID || ''),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
