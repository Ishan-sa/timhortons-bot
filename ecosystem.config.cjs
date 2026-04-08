module.exports = {
  apps: [
    {
      name: "timhortons-bot",
      script: "npx",
      args: "tsx index.ts",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env_file: ".env",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
