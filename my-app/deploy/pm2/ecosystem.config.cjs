module.exports = {
  apps: [
    {
      name: "pear-media-lab",
      cwd: "/var/www/pear-media-lab/my-app",
      script: "server.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8787,
        HF_PROVIDER: "hf-inference",
      },
    },
    {
      name: "pear-media-lab-api",
      cwd: "/var/www/pear-media-lab/my-app",
      script: "api-server.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 8788,
        HF_PROVIDER: "hf-inference",
      },
    },
  ],
};
