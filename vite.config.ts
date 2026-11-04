import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    envPrefix: ['VITE_', 'INSFORGE_'],
    define: {
      'process.env.INSFORGE_API_URL': JSON.stringify(env.INSFORGE_API_URL || env.VITE_INSFORGE_API_URL || ''),
      'process.env.INSFORGE_ANON_KEY': JSON.stringify(env.INSFORGE_ANON_KEY || env.VITE_INSFORGE_ANON_KEY || ''),
      'process.env.INSFORGE_PROJECT_ID': JSON.stringify(env.INSFORGE_PROJECT_ID || env.VITE_INSFORGE_PROJECT_ID || ''),
      'process.env.INSFORGE_DATABASE_URL': JSON.stringify(env.INSFORGE_DATABASE_URL || ''),
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
