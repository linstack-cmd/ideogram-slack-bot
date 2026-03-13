const { config } = require('./config');
const logger = require('./logger');

/**
 * Generate an image using the Ideogram API.
 * @param {string} prompt - The text prompt for image generation.
 * @returns {Promise<{url: string, seed: number}>} The generated image URL and seed.
 */
async function generateImage(prompt) {
  const url = `${config.ideogram.baseUrl}/generate`;

  const body = {
    image_request: {
      prompt,
      model: config.ideogram.model,
      custom_model_uri: config.ideogram.customModelUri,
      aspect_ratio: config.ideogram.aspectRatio,
      rendering_speed: config.ideogram.renderSpeed,
    },
  };

  logger.debug('Ideogram request', { url, body });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': config.ideogram.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new IdeogramError('Rate limited by Ideogram — please try again in a minute.', 429);
    }
    if (res.status === 422) {
      throw new IdeogramError(`Ideogram rejected the prompt (422): ${text || 'invalid request'}`, 422);
    }
    throw new IdeogramError(`Ideogram API error ${res.status}: ${text || res.statusText}`, res.status);
  }

  const data = await res.json();
  logger.debug('Ideogram response', { data });

  const image = data?.data?.[0];
  if (!image?.url) {
    throw new IdeogramError('Ideogram returned no image URL');
  }

  return { url: image.url, seed: image.seed };
}

/**
 * Download an image from a URL and return the Buffer.
 * @param {string} imageUrl
 * @returns {Promise<Buffer>}
 */
async function downloadImage(imageUrl) {
  const headers = {};
  if (config.ideogram.cfAccessClientId && config.ideogram.cfAccessClientSecret) {
    headers['CF-Access-Client-Id'] = config.ideogram.cfAccessClientId;
    headers['CF-Access-Client-Secret'] = config.ideogram.cfAccessClientSecret;
  }

  const res = await fetch(imageUrl, {
    redirect: 'follow',
    headers,
  });
  if (!res.ok) {
    throw new IdeogramError(`Failed to download image: ${res.status}`);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/')) {
    const finalUrl = res.url || imageUrl;
    const hostHint = finalUrl.includes('cloudflareaccess.com') || finalUrl.includes('/cdn-cgi/access/login')
      ? ' (Cloudflare Access protected URL)'
      : '';
    throw new IdeogramError(
      `Generated image URL is not publicly fetchable${hostHint}. Final content-type was '${contentType || 'unknown'}'.`,
      502,
    );
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

class IdeogramError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'IdeogramError';
    this.statusCode = statusCode;
  }
}

module.exports = { generateImage, downloadImage, IdeogramError };
