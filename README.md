# DTL War Room

A deployable Down The Line command center for the ten-agent social growth, monetization, meeting-room and opportunity system.

## Included

- TikTok / Instagram / YouTube monetization progress cards
- Ten persistent specialist agent views
- Meeting Room with individual agents, visible conclusions and CIO decision panel
- Opportunity Bot revenue pipeline and ready-to-pitch area
- Game Plan / Post Now view
- Live activity feed
- REST ingestion API for agent/automation results
- PostgreSQL persistence when `DATABASE_URL` is set
- Local JSON fallback for development
- Responsive dark war-room UI

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Railway deployment

This project is Railway-ready. Set `INGEST_TOKEN` to a strong secret. Add a PostgreSQL service and expose its `DATABASE_URL` to this service. Railway can run `npm start` automatically from `package.json`.

## Agent ingestion

POST JSON to `/api/ingest` with header `Authorization: Bearer <INGEST_TOKEN>`. Supported top-level fields are `platforms`, `agents`, `meeting`, `gamePlan`, `opportunities`, `verdicts`, `analytics`, and `activity`.

A dedicated lead can also be POSTed to `/api/opportunities`.

## Data integrity

The UI intentionally displays `DATA NOT CONNECTED` for private metrics such as qualified YouTube watch hours until an authorized analytics source provides the value. External pitches should use only metrics verified by the DTL analytics pipeline.
