# Ideogram Slack Bot

A Slack bot that generates AI images via [Ideogram](https://ideogram.ai) using the `/ideogram` slash command. Built with [@slack/bolt](https://slack.dev/bolt-js) in Socket Mode — no public URL required.

## Features

- `/ideogram <prompt>` — generates an image and uploads it to the channel
- Immediate acknowledgement (within 3s Slack limit)
- Progress indicator while generating
- Configurable model, aspect ratio, and render speed
- User-friendly error handling (rate limits, validation errors, timeouts)
- Graceful shutdown on SIGINT/SIGTERM

## Prerequisites

- **Node.js** ≥ 18 (uses native `fetch`)
- An **Ideogram API key** — [get one here](https://ideogram.ai/manage-api)
- A **Slack workspace** where you can install apps

## Slack App Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g., "Ideogram Bot") and pick your workspace

### 2. Enable Socket Mode

1. Go to **Settings → Socket Mode** → toggle **Enable Socket Mode**
2. Create an **App-Level Token** with scope `connections:write` — save this as `SLACK_APP_TOKEN` (starts with `xapp-`)

### 3. Add Bot Token Scopes

Go to **OAuth & Permissions → Scopes → Bot Token Scopes** and add:

| Scope | Purpose |
|---|---|
| `chat:write` | Post messages and progress updates |
| `commands` | Handle slash commands |
| `files:write` | Upload generated images |
| `channels:join` | Auto-join public channels before posting |
| `channels:read` | Read channel metadata for join/post flows |

### 4. Create the Slash Command

Go to **Slash Commands** → **Create New Command**:

| Field | Value |
|---|---|
| Command | `/ideogram` |
| Short Description | Generate an image with Ideogram AI |
| Usage Hint | `a cat riding a bicycle in watercolor style` |

> **Note:** In Socket Mode, you do **not** need a Request URL — leave it blank or enter any placeholder.

### 5. Install to Workspace

Go to **Install App** → **Install to Workspace** → authorize. Copy the **Bot User OAuth Token** as `SLACK_BOT_TOKEN` (starts with `xoxb-`).

### 6. Invite the Bot

In any Slack channel where you want to use `/ideogram`, invite the bot: `/invite @Ideogram Bot`

## Installation

```bash
git clone https://github.com/linstack-cmd/ideogram-slack-bot.git
cd ideogram-slack-bot
npm install
cp .env.example .env
# Edit .env with your tokens
```

## Configuration

Edit `.env` with your credentials:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
IDEOGRAM_API_KEY=your-ideogram-api-key
IDEOGRAM_BASE_URL=https://api.ideogram.ai

# Optional
IDEOGRAM_RENDER_SPEED=TURBO        # TURBO | QUALITY | DEFAULT
IDEOGRAM_ASPECT_RATIO=ASPECT_1_1   # ASPECT_1_1, ASPECT_16_9, ASPECT_9_16, etc.
IDEOGRAM_MODEL=V_2                  # V_1, V_1_TURBO, V_2, V_2_TURBO, V_2A, V_2A_TURBO
IDEOGRAM_CUSTOM_MODEL_URI=model/_vEtS-iCTVWow-2WZvm11g/version/0
IDEOGRAM_MODEL_VERSION=V_3_1
IDEOGRAM_SAMPLING_SPEED=-2
IDEOGRAM_USE_AUTOPROMPT_OPTION=ON
IDEOGRAM_STYLE_TYPE=AUTO
IDEOGRAM_API_FORMAT=legacy          # legacy | v1
CF_ACCESS_CLIENT_ID=                # optional (Cloudflare Access-protected image URLs)
CF_ACCESS_CLIENT_SECRET=            # optional (Cloudflare Access-protected image URLs)
LOG_LEVEL=info                      # debug | info | warn | error
```

## Usage

```bash
# Production
npm start

# Development (auto-restart on changes, requires Node ≥ 18.11)
npm run dev
```

Then in Slack:

```
/ideogram a sunset over Toronto skyline, oil painting style
```

The bot will:
1. Acknowledge immediately
2. Post a "generating…" status message
3. Generate the image via Ideogram API
4. Upload the image to the channel
5. Clean up the status message

## Project Structure

```
src/
├── index.js      # App entry point, Bolt setup, graceful shutdown
├── config.js     # Environment validation and config
├── command.js    # /ideogram command handler
├── ideogram.js   # Ideogram API client (generate + download)
└── logger.js     # Simple leveled logger
```

## Error Handling

| Scenario | User sees |
|---|---|
| Empty prompt | "Please provide a prompt" (ephemeral) |
| Prompt too long | "Prompt is too long" (ephemeral) |
| Rate limited (429) | "Rate limited — wait a minute" |
| Invalid prompt (422) | Ideogram's rejection reason |
| Timeout (>2min) | "Generation timed out" |
| Other errors | "Something went wrong" |

## License

MIT
