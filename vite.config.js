import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bot rewrites public/snapshot.json every few minutes — don't full-reload the page for that.
    // The app re-fetches it silently instead (see App.jsx polling).
    watch: {
      ignored: ['**/public/snapshot.json', '**/snapshot.json'],
    },
  },
})
