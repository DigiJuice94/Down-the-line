# DTL War Room v1.3

This build keeps the mobile War Room and specific DTL-video assignments, and adds a real server-side Opportunity scanner.

## Opportunity Bot
- Starts a public-source scan shortly after Railway boots.
- Re-scans every 30 minutes by default.
- Searches public web and Google News result feeds for creator sponsorships, affiliate programs, creator campaigns, product seeding, PR samples, food/beverage opportunities, gaming opportunities, and entertainment/podcast partnerships.
- Stores source-linked lead signals, DTL fit score, scan time, source count, and scanner status.
- Never invents compensation or contacts: those remain marked unverified until a public source confirms them.
- Includes a **SCAN NOW** button on the Opportunities tab.

Optional: set `OPPORTUNITY_SCAN_INTERVAL_MINUTES` on Railway to change the default 30-minute cycle (minimum 10). No new variable is required.

Required root files for Railway remain `server.js`, `package.json`, and `railway.json`.
