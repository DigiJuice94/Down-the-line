# DTL War Room — Live Platform Count Trackers

This update adds automatic public follower/subscriber refreshes to the three monetization cards.

## What now refreshes automatically
- TikTok `@down.the.line.pod` follower count
- Instagram `@down.the.line.pod` follower count
- YouTube `@Down.The.Line.Podcast` subscriber count

The tracker runs on Railway at startup and then every 10 minutes by default. Set `PLATFORM_REFRESH_MINUTES` to another value (minimum 5) if desired.

Each card now shows whether the count is LIVE / RETRYING / TRACKING and when the last public count was verified. If a platform blocks Railway, the last verified count stays visible rather than being replaced by a guess.

The Instagram nearest-unlock progress bar updates with its follower count. YouTube and TikTok private watch/eligible-view metrics stay DATA NOT CONNECTED unless an authorized analytics source provides them.

Manual refresh endpoint: `POST /api/platform-refresh` (uses `INGEST_TOKEN` if configured).
