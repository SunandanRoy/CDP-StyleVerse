import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// The standalone artifact must make zero runtime network requests (the
// "standalone gate" in tests/standalone-gate.spec.mjs enforces this). The
// dev/production build loads brand display fonts from Google Fonts, which
// silently violates that when built as the artifact — this strips those
// tags for that build only, so every brand's font-family chain falls back
// to its own already-specified system font instead (each BRANDS entry in
// shared/contract-constants.mjs lists one, e.g. "'Oswald', 'Arial
// Narrow', sans-serif") rather than failing or hanging on a network call
// that has nowhere to go once the file is opened via file://.
function stripGoogleFontsForArtifact() {
  return {
    name: 'strip-google-fonts-for-artifact',
    transformIndexHtml(html) {
      return html.replace(/\s*<link[^>]*fonts\.g(?:oogleapis|static)\.com[^>]*>\n?/g, '')
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile(), stripGoogleFontsForArtifact()] : [])],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build:
    mode === 'artifact'
      ? { outDir: 'dist-artifact', cssCodeSplit: false, assetsInlineLimit: 100000000 }
      : undefined
}))
