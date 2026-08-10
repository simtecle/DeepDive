# DeepDive

DeepDive turns any topic into a curated YouTube learning path (Beginner → Intermediate → Advanced) and keeps the library maintained via automated ingestion and classification jobs.

## Demo
- Live app: https://www.deepdivepath.com
- Demo video (unlisted): https://youtu.be/kKaIN7ok1Ec

## Screenshots
![Home](docs/images/Home.jpg)
![Search](docs/images/Search.jpg)


## Why this exists
Searching “learn X” on YouTube is noisy and inconsistent. DeepDive aims to:
- keep results on-topic (canonical topic matching)
- reduce low-signal content (shorts/ultra-short filtering + publish gate)
- maintain coverage over time (top-up + backfill jobs)

## Features
- Topic search with canonical matching and “Did you mean …” suggestions
- Learning-path UI (snake-track layout) with “Show more” per level
- Topic request flow (users can request missing topics)
- Automated ingestion pipeline:
  - Import candidates from YouTube Data API
  - Classify and enrich metadata
  - Publish gate to keep off-topic / low-confidence items out
- Maintenance automation:
  - Import-only cron job (keeps queue small)
  - Classify-queued cron job (drains queue steadily)
  - Backfill job (tops up under-covered topics with cost-aware cooldowns)

## Tech stack
- Next.js (App Router), TypeScript, Tailwind
- Supabase (Postgres, RLS)
- Vercel (deployments + cron)
- YouTube Data API for discovery
- LLM-based classification (server-side)

## Architecture 
1. `topic_requests` collects user requests and seed topics  
2. `process-topic-requests` imports YouTube candidates into `videos` as `queued`  
3. `classify-queued` classifies queued rows and promotes them to `published` or rejects them  
4. `backfill-topics` periodically tops up low-coverage topics with cooldown/stop conditions

## Run locally
>  Create your own `.env.local`.

1) Install
```bash
npm install
```

2) Create `.env.local`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Admin / Cron
ADMIN_TOKEN=...
CRON_SECRET=...

# YouTube + classification
YOUTUBE_API_KEY=...
OPENAI_API_KEY=...
```

3) Start
```bash
npm run dev
```

## Deployment notes
- Admin routes require `x-admin-token: <ADMIN_TOKEN>`
- Cron routes accept Vercel scheduled runs (`x-vercel-cron: 1`) or manual runs via
  `Authorization: Bearer <CRON_SECRET>`

## Security notes (summary)
- Supabase RLS: only published+active rows are public-readable
- Service Role key is server-only (never exposed to the client)
- Admin and cron endpoints are authenticated and rate-limited

## Roadmap
- Improve topic taxonomy (topic_key/topic_id-first everywhere)
- Add better topic suggestion ranking and coverage visualizations
- Add user accounts and saved learning paths
