const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const PAGE = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');

const SEED_STATE = {
  meta: { project: 'Down The Line', updatedAt: '2026-09-15T00:00:00Z', mode: 'seed' },
  platforms: [
    { id:'tiktok', name:'TikTok', handle:'@down.the.line.pod', followers:913, followerTarget:10000, metricLabel:'Eligible views / 30d', metricValue:null, metricTarget:100000, status:'Tracking public count', note:'Creator Rewards requirements must be revalidated from official TikTok sources; private eligible-view data requires authorized analytics.' },
    { id:'instagram', name:'Instagram', handle:'@down.the.line.pod', followers:100, followerTarget:500, metricLabel:'Nearest native unlock', metricValue:100, metricTarget:500, status:'Gifts path', note:'Instagram has multiple monetization paths. This card tracks the nearest published follower-based native unlock, not a universal monetization threshold.' },
    { id:'youtube', name:'YouTube', handle:'@Down.The.Line.Podcast', followers:1540, followerTarget:1000, metricLabel:'Qualified watch hours / 365d', metricValue:null, metricTarget:4000, status:'Subscriber goal cleared', note:'Qualified watch hours are private analytics and remain DATA NOT CONNECTED until an authorized source provides them.' }
  ],
  agents: [
    { id:'hook', name:'HOOK', role:'Hook Specialist', initials:'HK', status:'Watching', current:'Opening strength across recent clips', confidence:82, finding:'Make the premise understandable before the viewer has time to scroll.' },
    { id:'retention', name:'RETENTION', role:'Retention Specialist', initials:'RT', status:'Analyzing', current:'Pacing and payoff timing', confidence:76, finding:'Track where setup stops adding value and move the payoff forward.' },
    { id:'content', name:'CONTENT', role:'Content Specialist', initials:'CT', status:'Watching', current:'Topic and standalone clip value', confidence:79, finding:'Prioritize moments that work without needing full-episode context.' },
    { id:'packaging', name:'PACKAGING', role:'Packaging Specialist', initials:'PK', status:'Analyzing', current:'Titles, captions and thumbnails', confidence:81, finding:'Packaging should make one clear promise instead of describing everything.' },
    { id:'performance', name:'PERFORMANCE', role:'Performance Specialist', initials:'PF', status:'Tracking', current:'Cross-platform public performance', confidence:88, finding:'Build a verified baseline before declaring a format a winner.' },
    { id:'discovery', name:'DISCOVERY', role:'Discovery & Experiment Specialist', initials:'DS', status:'Testing', current:'Posting windows and format variables', confidence:71, finding:'Change one major variable at a time so the team can learn what caused the result.' },
    { id:'algorithm', name:'ALGORITHM', role:'Algorithm & Trend Intelligence', initials:'AL', status:'Researching', current:'Platform guidance and current trends', confidence:77, finding:'Treat trends as time-sensitive opportunities, not permanent rules.' },
    { id:'competitive', name:'COMPETITIVE', role:'Competitive Pattern Specialist', initials:'CP', status:'Researching', current:'Winning patterns in DTL categories', confidence:74, finding:'Adapt repeatable structures without copying creators.' },
    { id:'goal', name:'GOAL', role:'Goal & Monetization Specialist', initials:'GL', status:'Tracking', current:'Monetization bottlenecks', confidence:90, finding:'YouTube subscriber threshold is cleared; qualified watch-hour data is the missing monetization metric.' },
    { id:'opportunity', name:'OPPORTUNITY', role:'Revenue Opportunity Scout', initials:'OP', status:'Scouting', current:'Sponsors, affiliates and product seeding', confidence:75, finding:'Pitch with the strongest verified category-specific DTL analytics, not generic vanity metrics.' }
  ],
  activity: [
    { time:'Now', agent:'OPPORTUNITY', text:'Opportunity pipeline initialized. Searching for paid, affiliate and product-seeding fits.' },
    { time:'Now', agent:'GOAL', text:'Monetization tracker initialized with private-metric safeguards.' },
    { time:'Now', agent:'ALGORITHM', text:'POST NOW framework initialized for platform-specific recommendations.' }
  ],
  meeting: {
    title:'Strategy Meeting',
    status:'Ready for evidence',
    messages:[
      { agent:'GOAL', text:'Our job is not just growth. Every recommendation should move a monetization bottleneck.' },
      { agent:'PERFORMANCE', text:'Agreed, but we only promote claims backed by measurements we actually collected.' },
      { agent:'OPPORTUNITY', text:'Give me verified category performance and I will turn it into the strongest truthful sponsor pitch.' },
      { agent:'DISCOVERY', text:'I want controlled tests so we can tell sponsors what repeatedly works, not what worked once.' }
    ],
    decision: {
      stop:'Using unverified numbers in external pitches',
      start:'Building category-specific evidence packages',
      keep:'Honest review positioning',
      test:'Which DTL categories create the strongest sponsor response',
      immediate:'Collect verified analytics and rank the first outreach opportunities'
    }
  },
  gamePlan: {
    headline:'Build evidence, then turn it into reach and revenue.',
    postNow:[
      { platform:'TikTok', action:'Use a clear first-second premise, platform-relevant keywords, and only current relevant hashtags. Trend recommendations update when verified.' },
      { platform:'Instagram', action:'Package Reels for discovery while tracking the nearest native monetization unlock separately from long-term sponsorship value.' },
      { platform:'YouTube', action:'Subscriber goal is cleared. Prioritize long-form retention and qualified watch-hour growth while improving titles and thumbnails.' }
    ]
  },
  opportunities:[
    { id:'seed-1', brand:'Opportunity scouting active', type:'SYSTEM', fit:100, status:'NEW', compensation:'Awaiting verified leads', contact:'—', why:'The scout will add real opportunities only after verifying the brand, program, contact route and terms.', pitch:'No outreach is generated until a real lead and supporting DTL analytics are available.', source:'Pending live research' }
  ],
  verdicts: [], analytics: []
};

let memoryState = JSON.parse(JSON.stringify(SEED_STATE));
let pool = null;
let dbReady = false;
let server = null;

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

async function tryInitDb() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set; using in-memory state');
    return;
  }
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });
    await pool.query('SELECT 1');
    await pool.query(`CREATE TABLE IF NOT EXISTS war_room_state (
      id INTEGER PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const { rows } = await pool.query('SELECT id FROM war_room_state WHERE id=1');
    if (!rows.length) await pool.query('INSERT INTO war_room_state (id,payload) VALUES (1,$1)', [memoryState]);
    dbReady = true;
    console.log('PostgreSQL connected');
  } catch (err) {
    dbReady = false;
    console.error('PostgreSQL unavailable; continuing with in-memory state:', err.message);
  }
}

async function getState() {
  if (dbReady && pool) {
    try {
      const { rows } = await pool.query('SELECT payload FROM war_room_state WHERE id=1');
      if (rows[0]?.payload) return rows[0].payload;
    } catch (err) {
      console.error('Database read failed; using memory state:', err.message);
    }
  }
  return memoryState;
}

async function saveState(state) {
  state.meta = state.meta || {};
  state.meta.updatedAt = new Date().toISOString();
  state.meta.mode = dbReady ? 'postgres' : 'memory';
  memoryState = state;
  if (dbReady && pool) await pool.query('UPDATE war_room_state SET payload=$1, updated_at=NOW() WHERE id=1', [state]);
  return state;
}

function authorized(req) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function sendStatic(res, fileName, type) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=86400');
  return res.type(type).sendFile(filePath);
}

app.get('/logo.png', (_req, res) => sendStatic(res, 'logo.png', 'png'));
app.get('/hero-workers.png', (_req, res) => sendStatic(res, 'hero-workers.png', 'png'));
app.get('/health', (_req, res) => res.status(200).json({ ok:true, service:'dtl-war-room', database:dbReady ? 'connected' : 'memory-fallback', frontend:'visual-hero-update', time:new Date().toISOString() }));
app.get('/api/state', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getState());
  } catch (err) {
    console.error('State endpoint failed:', err);
    res.status(500).json({ error:'Unable to load War Room state', detail: err.message });
  }
});
app.post('/api/ingest', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    const state = await getState();
    const event = req.body || {};
    for (const key of ['platforms','agents','meeting','gamePlan','opportunities','verdicts','analytics']) {
      if (event[key] !== undefined) state[key] = event[key];
    }
    if (event.activity) state.activity = [...event.activity, ...(state.activity || [])].slice(0, 100);
    res.json({ ok:true, state: await saveState(state) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/agents/:id', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    const state = await getState();
    const id = String(req.params.id || '').toLowerCase();
    const index = (state.agents || []).findIndex(a => String(a.id).toLowerCase() === id);
    if (index < 0) return res.status(404).json({ error:'Agent not found' });
    const patch = req.body || {};
    const updated = { ...state.agents[index], ...patch, id: state.agents[index].id, taskUpdatedAt: new Date().toISOString() };
    state.agents[index] = updated;
    state.activity = [{ time:'Now', agent:updated.name, text:`Current task updated: ${updated.targetTitle || updated.videoTitle || updated.current || 'assignment changed'}` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    res.json({ ok:true, agent:updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/opportunities', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error:'Unauthorized' });
  try {
    const state = await getState();
    const body = req.body || {};
    const item = { ...body, id: body.id || `opp-${Date.now()}`, createdAt: new Date().toISOString() };
    state.opportunities = [item, ...(state.opportunities || []).filter(x => x.id !== 'seed-1')];
    state.activity = [{ time:'Now', agent:'OPPORTUNITY', text:`New opportunity: ${item.brand || 'Unnamed lead'}` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    res.json({ ok:true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (_req, res) => res.status(200).type('html').send(PAGE));
app.use((req, res) => res.status(200).type('html').send(PAGE));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error:'Server error' });
});

server = app.listen(PORT, HOST, () => {
  console.log(`DTL War Room listening on http://${HOST}:${PORT}`);
  tryInitDb();
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down cleanly`);
  if (server) server.close(async () => {
    try { if (pool) await pool.end(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
