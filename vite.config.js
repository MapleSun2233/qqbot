import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 设置相对路径，确保打包后的资源使用相对路径
  base: './',
  build: {
    // 确保资源文件使用相对路径
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // 确保JS和CSS文件使用相对路径
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
