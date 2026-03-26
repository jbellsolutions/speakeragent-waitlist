# Speaker Agent AI - Waitlist & Beta Application

Waitlist landing page and beta testers application for Speaker Agent AI.

## Local Development

```bash
npm install
npm start
```

Open http://localhost:3000

## Routes

- `/` - Waitlist / newsletter opt-in page
- `/beta` - Beta testers invitation page (not publicly linked)
- `/thanks` - Waitlist confirmation
- `/beta-thanks` - Beta application confirmation

## API Endpoints

- `POST /api/waitlist` - Submit email to waitlist
- `POST /api/beta-apply` - Submit beta application
- `GET /api/stats` - Get waitlist count and spots remaining

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and create a new project
3. Select "Deploy from GitHub repo"
4. Pick this repository
5. Railway auto-detects the config from `railway.toml`
6. Deploy — no environment variables required (PORT is set automatically by Railway)

Alternatively, deploy with the Railway CLI:

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## Data Storage

Email signups and beta applications are stored in JSON files under `/data`. For production at scale, swap to a database. For early-stage waitlist collection, this is sufficient and has zero external dependencies.

## Tech Stack

- Node.js / Express
- Plain HTML / CSS / JS (no frameworks)
- JSON file storage
- Rate limiting via express-rate-limit
- Security headers via helmet
