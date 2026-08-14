import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // enhancedLogs pipes console output between the client and the dev server.
    // The two ends echo each other, so a single console warning snowballs into
    // thousands of messages a second on every page, which makes the app janky
    // — most visibly when dragging on the finances canvas. The devtools panel
    // itself is unaffected by turning the piping off.
    devtools({ enhancedLogs: { enabled: false } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  // `vite preview` (used as the prod server, see client/Dockerfile) rejects
  // unrecognized Host headers by default — allow Render's domain.
  preview: { allowedHosts: ['.onrender.com'] },
})

export default config
