const { generateImage, downloadImage, IdeogramError } = require('./ideogram');
const logger = require('./logger');

/**
 * Register slash command handlers on the Bolt app.
 * @param {import('@slack/bolt').App} app
 */
function registerIdeogramCommand(app) {
  const handler = async ({ command, ack, client, respond }) => {
    // Acknowledge immediately (must happen within 3s)
    await ack();

    const prompt = (command.text || '').trim();
    if (!prompt) {
      await respond({
        response_type: 'ephemeral',
        text: '⚠️ Please provide a prompt. Usage: `/ideogram a cat riding a bicycle`',
      });
      return;
    }

    if (prompt.length > 2000) {
      await respond({
        response_type: 'ephemeral',
        text: '⚠️ Prompt is too long (max 2000 characters).',
      });
      return;
    }

    const channelId = command.channel_id;
    const userId = command.user_id;

    logger.info(`${command.command} from user=${userId} channel=${channelId} prompt="${prompt.slice(0, 80)}..."`);

    // Post a "generating" message
    let statusMsg;
    try {
      statusMsg = await client.chat.postMessage({
        channel: channelId,
        text: `🎨 <@${userId}> is generating: _${escapeSlack(prompt.slice(0, 200))}${prompt.length > 200 ? '…' : ''}_\n⏳ Working on it…`,
      });
    } catch (err) {
      logger.error('Failed to post status message', { error: err.message });
    }

    try {
      // Generate
      const { url: imageUrl } = await generateImage(prompt);
      logger.info('Image generated', { imageUrl: imageUrl.slice(0, 100) });

      // Download
      const imageBuffer = await downloadImage(imageUrl);
      logger.info('Image downloaded', { bytes: imageBuffer.length });

      // Upload to Slack
      await client.filesUploadV2({
        channel_id: channelId,
        file: imageBuffer,
        filename: 'ideogram.png',
        title: prompt.slice(0, 200),
        initial_comment: `🎨 *<@${userId}>*: _${escapeSlack(prompt.slice(0, 500))}_`,
      });

      // Remove the "generating" status message
      if (statusMsg?.ts) {
        await client.chat.delete({ channel: channelId, ts: statusMsg.ts }).catch(() => {});
      }

      logger.info('Image uploaded to Slack');
    } catch (err) {
      logger.error('Generation failed', { error: err.message, statusCode: err.statusCode });

      const userMessage = formatError(err);

      // Update the status message with the error, or post new
      if (statusMsg?.ts) {
        await client.chat.update({
          channel: channelId,
          ts: statusMsg.ts,
          text: `❌ ${userMessage}`,
        }).catch(() => {});
      } else {
        await respond({ response_type: 'ephemeral', text: `❌ ${userMessage}` });
      }
    }
  };

  app.command('/ideogram', handler);
  app.command('/typography', handler);
}

function formatError(err) {
  if (err instanceof IdeogramError) {
    if (err.statusCode === 429) {
      return 'Rate limited — please wait a minute and try again.';
    }
    if (err.statusCode === 422) {
      return `Your prompt was rejected by Ideogram: ${err.message}`;
    }
    return `Image generation failed: ${err.message}`;
  }
  if (err.name === 'AbortError') {
    return 'Image generation timed out. Try a simpler prompt or try again later.';
  }
  const detail = err?.data?.error || err?.code || err?.message;
  if (detail) {
    return `Something went wrong generating your image (${detail}).`;
  }
  return 'Something went wrong generating your image. Please try again.';
}

function escapeSlack(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { registerIdeogramCommand };
