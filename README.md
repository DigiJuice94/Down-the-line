# DTL War Room — Live Worker Fix

This build fixes the three problems reported in the live War Room:

- removes the large boxed hero and shows the transparent Down The Line logo centered at the top
- restores the real Railway worker engine from the previously working DTL worker build
- makes worker status dots depend on fresh worker proof / heartbeats instead of seeded status text
- refreshes trends every 10 minutes and shows freshness / next scan timing

The build downloads the previously working real worker backend during Railway's build, so the main web server can keep the newer Opportunity-first UI while the older proven worker engine processes real sources in the background.
