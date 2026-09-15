# DTL War Room v1.7 — Real autonomous workers (cumulative)

This build includes **everything from v1.4/v1.5**: direct Opportunity verification, news/article rejection, public contact-email discovery, application routes, pre-written outreach emails, and proof-of-work enforcement. It adds the missing autonomous engines for the other nine specialists.

## Real work now performed

- **HOOK** downloads a bounded sample from a real DTL video, extracts captions when available, and runs FFmpeg scene/silence analysis on the opening.
- **RETENTION** processes real media for scene-change cadence, silence/dead-air pockets, caption speech density, and long low-change stretches.
- **CONTENT** analyzes the real source transcript/description for topic clarity and standalone context.
- **PACKAGING** compares the real title/metadata with the opening transcript and source structure.
- **PERFORMANCE** opens recent DTL posts and stores public performance snapshots so later cycles can compare changes.
- **DISCOVERY** compares real posting-time, duration, and public-performance samples and labels small-sample findings as tests, not rules.
- **ALGORITHM** opens official YouTube/TikTok/Meta guidance pages and records exactly which sources were reachable.
- **COMPETITIVE** runs real public YouTube comparison searches based on the current DTL topic.
- **GOAL** refreshes public channel metrics when exposed and checks official monetization guidance without inventing private watch hours.
- **OPPORTUNITY** remains the v1.4 direct-opportunity scanner with verified routes and outreach drafts.

A video specialist only claims real media processing when `yt-dlp` successfully acquires media and FFmpeg analyzes it. If a platform blocks Railway, the card reports **BLOCKED / RETRY SCHEDULED** instead of showing fake Watching activity. Every worker has a run ID, source URL, heartbeat, processed range/count, and evidence.

## Railway

Upload **every file** in this ZIP to the repository root. `nixpacks.toml` installs `yt-dlp` and FFmpeg automatically. No new variable is required. Existing `DATABASE_URL` and optional `INGEST_TOKEN` remain supported.

Default schedules: nine-agent worker cycle every 20 minutes; Opportunity scan every 30 minutes. The dashboard also has **RUN ALL WORKERS NOW** and **SCAN NOW**.

Optional only: `DTL_COOKIES_FILE` may point to a Netscape cookie file if TikTok/Instagram later require authenticated server-side access. A blocked platform is never reported as a successful run.


## v1.7 continuous episode viewing
Media workers now consume each assigned DTL video continuously from 0:00 through 10:00, or the full runtime when the video is shorter than ten minutes. The same acquired media analysis is shared between specialists assigned to the same episode so Hook/Packaging and Retention/Content do not redundantly acquire the same ten-minute window. Retention and Content use the full continuous transcript window, one-minute topic windows, scene changes, silence, pacing, and likely topic/segment transitions. Worker proof records the exact continuous range analyzed.


## v1.10 mobile monochrome redesign
Mobile-first black-and-white War Room: true black background, white text and controls, stronger DTL header lockup, and recognizable white bot faces with simple role-specific expressions. Continuous ten-minute viewing and all v1.7 worker functionality remain intact. Desktop refinement is intentionally deferred for a later pass.


## v1.10 worker recovery

- Fixes the Railway/YouTube failure shown as `Sign in to confirm you’re not a bot`.
- Railway now builds a current yt-dlp runtime plus the bgutil PO-token provider and Node JS runtime support.
- A blocked YouTube/TikTok/Instagram source no longer marks every worker as failed. Each worker records its own source result and the rest of the cycle keeps running.
- YouTube discovery has an RSS fallback when profile extraction is blocked. Set `DTL_YOUTUBE_CHANNEL_ID` only if the handle page itself cannot expose the channel ID.
- Optional emergency auth: `DTL_YOUTUBE_COOKIES_B64` can contain a base64 Netscape-format YouTube cookie file. This is not required for the first deploy and should only be used if YouTube continues blocking Railway after the PO-token path. Do not paste account passwords into the app.
- Worker engine now reports `PARTIAL / SCHEDULED` instead of turning the entire team red when one source is inaccessible.
- The continuous ten-minute episode analysis and the v1.8 black/white mobile design remain intact.


## v1.10 Railway build recovery

- Replaces the failing `python3 -m virtualenv .venv` build step with Nixpacks' supported `python -m venv --copies .venv` pattern.
- Removes the redundant Nix `pip`/`virtualenv` packages that caused the failed stage.
- Installs current `yt-dlp[default]` plus `bgutil-ytdlp-pot-provider==2.0.0` inside the project venv.
- Requires Node 22+ for the current yt-dlp EJS challenge solver.
- Updates bgutil 2.0 script-provider arguments to `server_home` and `youtube:player-client=mweb`.
- Keeps the mobile black/white UI and continuous ten-minute worker analysis from prior cumulative versions.
