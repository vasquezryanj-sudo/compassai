# Compass AI v2

Responsible AI Governance Assessment tool.

## Setup

```bash
npm install
cp .env.example .env
# Add your Anthropic API key to .env
npm start
```

Open http://localhost:3000

## Files

- `index.html` — the entire frontend
- `server.js` — minimal Node proxy (keeps API key server-side)
- `.env` — your API key (never commit this)

## Deploy

Works on any Node host: Render, Railway, Fly.io.
Set the `ANTHROPIC_API_KEY` environment variable and deploy.
