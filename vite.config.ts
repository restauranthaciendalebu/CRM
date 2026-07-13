import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isGhPages = process.env.GITHUB_PAGES === 'true';
  return {
    base: isGhPages ? '/CRM/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase';
            if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
            if (id.includes('/lucide-react/') || id.includes('/lucide-react-native/')) return 'icons';
            if (id.includes('/motion/')) return 'motion';
          },
        },
      },
    },
  };
});
