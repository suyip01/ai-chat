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
            if (id.includes('/react-dom')) return 'vendor-react-dom'
            if (id.includes('/react/')) return 'vendor-react'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('lucide')) return 'vendor-icons'
            return 'vendor'
          }
          if (id.includes('/src/admin/components/')) return 'admin-components'
          if (id.includes('/src/admin/pages/')) return 'admin-pages'
          if (id.includes('/src/admin/')) return 'admin'

          if (id.includes('/src/user/App')) return 'user-app'
          if (id.includes('/src/user/animations')) return 'user-animations'

          if (id.includes('/src/user/components/Chat')) return 'user-chat'
          if (id.includes('/src/user/components/Story')) return 'user-story'
          if (id.includes('/src/user/components/CharacterProfile')) return 'user-profile'
          if (id.includes('/src/user/components/MePage')) return 'user-me'
          if (id.includes('/src/user/components/Login')) return 'user-login'
          if (id.includes('/src/user/components/CreateCharacter')) return 'user-create-character'
          if (id.includes('/src/user/components/CreateStory')) return 'user-create-story'
          if (id.includes('/src/user/components/ModelSelectorSheet')) return 'user-model-sheet'
          if (id.includes('/src/user/components/UserRoleSelectorSheet')) return 'user-role-sheet'
          if (id.includes('/src/user/components/UserCharacterSettings')) return 'user-settings'
          if (id.includes('/src/user/components/BottomNav')) return 'user-bottomnav'
          if (id.includes('/src/user/components/TopBar')) return 'user-topbar'

          if (id.includes('/src/user/services/chatService')) return 'svc-chat'
          if (id.includes('/src/user/services/storiesService')) return 'svc-stories'
          if (id.includes('/src/user/services/userStoriesService')) return 'svc-user-stories'
          if (id.includes('/src/user/services/userCharactersService')) return 'svc-user-characters'
          if (id.includes('/src/user/services/charactersService')) return 'svc-characters'
          if (id.includes('/src/user/services/http')) return 'svc-http'

          if (id.includes('/src/user/services/')) return 'user-services'
          if (id.includes('/src/user/components/')) return 'user-components'
        }
      }
    }
  }
}
