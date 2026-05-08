import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, 'src');

function getPublicEnv(name, fallback) {
  return process.env[`VITE_${name}`] || fallback;
}

const processEnvShim = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  VITE_APP_URL: getPublicEnv('APP_URL', 'http://localhost:5173'),
  VITE_DEMO_MODE: getPublicEnv('DEMO_MODE', 'false'),
  VITE_GOOGLE_MAPS_API_KEY: getPublicEnv('GOOGLE_MAPS_API_KEY', ''),
};

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': JSON.stringify(processEnvShim),
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: '@frontend/', replacement: `${frontendSrc}/` },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) {
            return undefined;
          }

          const packagePath = id.split('/node_modules/')[1];

          if (
            packagePath.startsWith('react/') ||
            packagePath.startsWith('react-dom/') ||
            packagePath.startsWith('scheduler/')
          ) {
            return 'react-vendor';
          }

          if (
            packagePath.startsWith('react-router/') ||
            packagePath.startsWith('react-router-dom/') ||
            packagePath.startsWith('i18next/') ||
            packagePath.startsWith('react-i18next/') ||
            packagePath.startsWith('@tanstack/') ||
            packagePath.startsWith('axios/') ||
            packagePath.startsWith('react-hot-toast/') ||
            packagePath.startsWith('lucide-react/')
          ) {
            return 'app-core';
          }

          if (
            packagePath.startsWith('framer-motion/') ||
            packagePath.startsWith('motion-dom/') ||
            packagePath.startsWith('motion-utils/')
          ) {
            return 'framer-motion';
          }

          if (
            packagePath.startsWith('antd/') ||
            packagePath.startsWith('@ant-design/') ||
            packagePath.startsWith('rc-') ||
            packagePath.startsWith('@rc-component/')
          ) {
            return 'antd-vendor';
          }

          if (
            packagePath.startsWith('@react-three/fiber/') ||
            packagePath.startsWith('three/') ||
            packagePath.startsWith('three-mesh-bvh/') ||
            packagePath.startsWith('three-stdlib/') ||
            packagePath.startsWith('troika-three-text/') ||
            packagePath.startsWith('troika-worker-utils/') ||
            packagePath.startsWith('camera-controls/') ||
            packagePath.startsWith('maath/') ||
            packagePath.startsWith('meshline/') ||
            packagePath.startsWith('stats-gl/') ||
            packagePath.startsWith('suspend-react/') ||
            packagePath.startsWith('tunnel-rat/') ||
            packagePath.startsWith('@use-gesture/') ||
            packagePath.startsWith('zustand/')
          ) {
            return 'three-support';
          }

          if (packagePath.startsWith('@react-three/drei/')) {
            return 'react-three-drei';
          }

          if (
            packagePath.startsWith('chart.js/') ||
            packagePath.startsWith('react-chartjs-2/')
          ) {
            return 'chartjs-vendor';
          }

          if (
            packagePath.startsWith('leaflet/') ||
            packagePath.startsWith('react-leaflet/')
          ) {
            return 'maps-vendor';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
