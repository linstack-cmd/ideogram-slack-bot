const { App } = require('@slack/bolt');
const { config, validate } = require('./config');
const { registerIdeogramCommand } = require('./command');
const logger = require('./logger');

// Validate env before starting
validate();

const app = new App({
  token: config.slack.botToken,
  appToken: config.slack.appToken,
  socketMode: true,
});

// Register command handlers
registerIdeogramCommand(app);

// Start
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  logger.info(`⚡ Ideogram Slack bot is running (Socket Mode, port ${port})`);
})();

// Graceful shutdown
function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down…`);
  app.stop().then(() => {
    logger.info('Stopped cleanly');
    process.exit(0);
  }).catch((err) => {
    logger.error('Error during shutdown', { error: err.message });
    process.exit(1);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
