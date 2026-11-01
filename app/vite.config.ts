/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 baut eine einzige HTML-Datei (für das Claude-Artifact / Offline-Nutzung).
const single = process.env.SINGLE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
  build: single ? { assetsInlineLimit: 100_000_000, outDir: 'dist-single' } : {},
  test: { environment: 'node' },
})
