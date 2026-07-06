module.exports = {
  apps: [
    {
      name: "hsr-widget-api",
      script: "npm",
      args: "run dev",
      cwd: __dirname
    },
    {
      name: "hsr-discord-pusher",
      script: "scripts/push-discord-loop.sh",
      cwd: __dirname
    }
  ]
};
