# DTL War Room — Opportunity First Update

Homepage order now starts with:
1. Opportunities split into Free Product Reviews / Potential Sponsors / Potential Affiliates
2. Top 5 current hashtags + top 5 rising keywords
3. Rolling last-30-minute analysis summary
4. Worker workflow with glowing status dots
5. Platform monetization cards and deeper meeting/game-plan/activity tabs

Opportunity cards open dedicated `/opportunity/:id` pages with product/website links, contact route, partnership description, compensation details, and a pre-typed outreach email with a copy button.

New ingest endpoints:
- POST `/api/trends`
- POST `/api/analysis30m`
- Existing `/api/ingest` also accepts `trends` and `analysis30m`.
