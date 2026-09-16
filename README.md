# DTL War Room — Trackers Fixed

This build fixes the live tracker problem.

- Fixes the Railway build path that could place `worker-backend.js` in the wrong directory.
- Runtime self-heals by downloading the known-good worker backend if the build artifact is missing.
- Main dashboard now synchronizes real worker state from the internal worker backend every 5 seconds, even when PostgreSQL is not connected.
- Opportunities discovered by the scanner are merged into the visible Opportunity board automatically.
- Worker activity, analytics, verdicts and public platform counts from the worker backend are synchronized into the main dashboard.
- Health endpoint now reports whether the internal worker backend is actually alive.
- Fixed opportunity categorization so explicit Free Product / Sponsor / Affiliate categories stay where they belong.
- Node 22+ restored for the current yt-dlp / YouTube challenge stack.

Railway should redeploy automatically after these files replace the current project.
