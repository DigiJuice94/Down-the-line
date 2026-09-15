# DTL War Room — Railway-safe build

This build embeds the entire frontend and seed state inside `server.js`. It does **not** require a `public/` or `data/` folder, so a partial GitHub upload cannot cause `ENOENT: /app/public/index.html`.

Required files at repository root:
- `server.js`
- `package.json`
- `railway.json`

No environment variable is required to render the site. `DATABASE_URL` enables persistent Postgres state. `INGEST_TOKEN` protects write endpoints. Railway supplies `PORT`.


## v5 — agent CURRENTLY DOING cards
The main Command page and Agents page now show a structured **CURRENTLY DOING** panel for every specialist: task type, exact video/target when known, platform, detail, and last task update. Existing state remains compatible.

For live per-agent updates, send `POST /api/agents/:id` with fields such as `taskType`, `videoTitle`, `targetTitle`, `targetKind`, `platform`, `currentlyDoing`, `finding`, and `confidence`.
