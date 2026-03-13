require('dotenv').config();

const config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
  },
  ideogram: {
    apiKey: process.env.IDEOGRAM_API_KEY,
    baseUrl: process.env.IDEOGRAM_BASE_URL || 'https://api.ideogram.ai',
    renderSpeed: process.env.IDEOGRAM_RENDER_SPEED || 'TURBO',
    aspectRatio: process.env.IDEOGRAM_ASPECT_RATIO || 'ASPECT_1_1',
    model: process.env.IDEOGRAM_MODEL || 'V_2',
    customModelUri: process.env.IDEOGRAM_CUSTOM_MODEL_URI || 'model/_vEtS-iCTVWow-2WZvm11g/version/0',
    cfAccessClientId: process.env.CF_ACCESS_CLIENT_ID || '',
    cfAccessClientSecret: process.env.CF_ACCESS_CLIENT_SECRET || '',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};

function validate() {
  const missing = [];
  if (!config.slack.botToken) missing.push('SLACK_BOT_TOKEN');
  if (!config.slack.appToken) missing.push('SLACK_APP_TOKEN');
  if (!config.ideogram.apiKey) missing.push('IDEOGRAM_API_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

module.exports = { config, validate };
