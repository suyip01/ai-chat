module.exports = {
  apps: [
    {
      name: 'ai-chat-server',
      script: './src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        LOG_LEVEL: 'info',
        LOG_PRETTY: 'true',
        DOTENV_CONFIG_PATH: './.env'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        LOG_LEVEL: 'info',
        LOG_PRETTY: 'false',
        DOTENV_CONFIG_PATH: './.env.production'
      }
    }
  ]
}
