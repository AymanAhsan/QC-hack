import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Throwaway design-exploration app. Nothing in frontend/ imports from here.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
