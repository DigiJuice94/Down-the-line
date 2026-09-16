# DTL War Room — Live Trends Fix

This update fixes the Trending Hashtags + Keywords panel so it does not remain frozen when TikTok Creative Center blocks Railway.

- Trend scan now runs every 5 minutes by default (configurable with `TREND_REFRESH_MINUTES`, minimum 3).
- TikTok hashtags are attempted directly, then through a public text mirror.
- If TikTok still blocks the server, the hashtag column is rebuilt from the current Google Trends feed every cycle and clearly labeled as a fallback.
- Fallback metrics are search momentum, not falsely labeled TikTok views.
- Keywords continue to refresh from Google Trends.
- Every cycle records a unique cycle ID, last completed time, next scan time, and activity event.
- Existing platform-count, opportunity, real-worker, logo and monetization-card fixes are preserved.
