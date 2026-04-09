module.exports = {
  apps: [
    {
      name: "timhortons-account1",
      script: "npx",
      args: "tsx index.ts",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env_file: ".env.account1",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
    {
      name: "timhortons-account2",
      script: "npx",
      args: "tsx index.ts",
      cwd: __dirname,
      interpreter: "none",
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env_file: ".env.account2",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
