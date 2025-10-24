import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',  // Слушать на всех интерфейсах IPv4
    port: 5173,
    strictPort: false, //брать следующий порт, если 5173 занят
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "wailsjs": path.resolve(__dirname, "./wailsjs"),
    },
  },
})
