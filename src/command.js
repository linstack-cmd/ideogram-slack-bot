const { generateImage, downloadImage, IdeogramError } = require('./ideogram');
const logger = require('./logger');

/**
 * Register slash command handlers on the Bolt app.
 * @param {import('@slack/bolt').App} app
 */
function registerIdeogramCommand(app) {
  const handler = async ({ command, ack, client, respond }) => {
    // Acknowledge immediately (must happen within 3s)
    await ack({
      response_type: 'ephemeral',
      text: '🎨 Got it — generating now…',
    });

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
    const threadTs = command.thread_ts || command.message_ts || undefined;

    logger.info(`${command.command} from user=${userId} channel=${channelId} prompt="${prompt.slice(0, 80)}..."`);

    // Optional status message in-channel (best-effort)
    let statusMsg;

    try {
      // Generate
      const { url: imageUrl } = await generateImage(prompt);
      logger.info('Image generated', { imageUrl: imageUrl.slice(0, 100) });

      // Download
      const imageBuffer = await downloadImage(imageUrl);
      logger.info('Image downloaded', { bytes: imageBuffer.length });

      // Ensure bot is in the channel (auto-join works for public channels)
      await ensureBotInChannel(client, channelId);

      // Upload to Slack
      await uploadImageToChannel(client, channelId, imageBuffer, prompt, userId, threadTs);

      // Remove the "generating" status message
      if (statusMsg?.ts) {
        await client.chat.delete({ channel: channelId, ts: statusMsg.ts }).catch(() => {});
      }

      logger.info('Image uploaded to Slack');
    } catch (err) {
      logger.error('Generation failed', { error: err.message, statusCode: err.statusCode });

      const userMessage = formatError(err);

      await respond({ response_type: 'ephemeral', text: `❌ ${userMessage}` });
    }
  };

  app.command('/ideogram', handler);
  app.command('/typography', handler);
}

async function ensureBotInChannel(client, channelId) {
  try {
    await client.conversations.join({ channel: channelId });
  } catch (err) {
    const code = err?.data?.error || err?.code || err?.message;
    // Ignore unsupported/private/DM cases — upload attempt will still run and provide real error if needed.
    if (code && [
      'method_not_supported_for_channel_type',
      'already_in_channel',
      'channel_not_found',
      'missing_scope',
    ].includes(code)) {
      logger.info('conversations.join skipped', { channelId, code });
      return;
    }
    logger.warn('conversations.join failed', { channelId, code });
  }
}

async function uploadImageToChannel(client, channelId, imageBuffer, prompt, userId, threadTs) {
  const payload = {
    channel_id: channelId,
    file: imageBuffer,
    filename: 'ideogram.png',
    title: prompt.slice(0, 200),
    initial_comment: `🎨 *<@${userId}>*: _${escapeSlack(prompt.slice(0, 500))}_`,
    ...(threadTs ? { thread_ts: threadTs } : {}),
  };

  try {
    await client.filesUploadV2(payload);
    return;
  } catch (err) {
    const code = err?.data?.error || err?.code || err?.message;
    // Retry once after a join attempt when bot is not yet in public channel.
    if (code === 'not_in_channel') {
      await ensureBotInChannel(client, channelId);
      await client.filesUploadV2(payload);
      return;
    }
    throw err;
  }
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
  if (detail === 'not_in_channel') {
    return 'I am not in that channel yet. For private channels, invite me first (`/invite @typography_generator`).';
  }
  if (detail) {
    return `Something went wrong generating your image (${detail}).`;
  }
  return 'Something went wrong generating your image. Please try again.';
}

function escapeSlack(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = { registerIdeogramCommand };
