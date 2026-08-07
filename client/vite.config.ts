import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  // `vite preview` (used as the prod server, see client/Dockerfile) rejects
  // unrecognized Host headers by default — allow Render's domain.
  preview: { allowedHosts: ['.onrender.com'] },
})

export default config
