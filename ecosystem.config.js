module.exports = {
  apps: [
    {
      name: 'nodekey-docs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '.',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3300,
      },
    },
  ],
};
