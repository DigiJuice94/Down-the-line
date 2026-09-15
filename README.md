# DTL War Room — Railway-safe build

This build embeds the entire frontend and seed state inside `server.js`. It does **not** require a `public/` or `data/` folder, so a partial GitHub upload cannot cause `ENOENT: /app/public/index.html`.

Required files at repository root:
- `server.js`
- `package.json`
- `railway.json`

No environment variable is required to render the site. `DATABASE_URL` enables persistent Postgres state. `INGEST_TOKEN` protects write endpoints. Railway supplies `PORT`.
