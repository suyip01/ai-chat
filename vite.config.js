/** @type {import('vite').UserConfig} */
module.exports = {
  root: 'src',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react/')) return 'vendor-react'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('lucide')) return 'vendor-icons'
            return 'vendor'
          }
          if (id.includes('/src/admin/')) return 'admin'
          if (id.includes('/src/user/services/')) return 'user-services'
          if (id.includes('/src/user/components/')) return 'user-components'
        }
      }
    }
  }
}
