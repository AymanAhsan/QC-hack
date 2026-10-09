import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev server listens on the LAN (`--host`) so a phone on the same Wi-Fi can
// open http://<computer-ip>:5173. Requests to /api are proxied to FastAPI, so
// the phone never needs to reach the backend port directly.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000',
      },
    },
  }
})
