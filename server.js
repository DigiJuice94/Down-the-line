const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } }) : null;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function initDb() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS war_room_state (id INTEGER PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const { rows } = await pool.query('SELECT id FROM war_room_state WHERE id=1');
  if (!rows.length) {
    const seed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    await pool.query('INSERT INTO war_room_state (id,payload) VALUES (1,$1)', [seed]);
  }
}

async function getState() {
  if (pool) {
    const { rows } = await pool.query('SELECT payload FROM war_room_state WHERE id=1');
    return rows[0].payload;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

async function saveState(state) {
  state.meta.updatedAt = new Date().toISOString();
  state.meta.mode = pool ? 'postgres' : 'local-json';
  if (pool) await pool.query('UPDATE war_room_state SET payload=$1, updated_at=NOW() WHERE id=1', [state]);
  else fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  return state;
}

function authorized(req) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

app.get('/api/state', async (_req,res) => {
  try { res.json(await getState()); } catch (e) { res.status(500).json({error:e.message}); }
});

app.post('/api/ingest', async (req,res) => {
  if (!authorized(req)) return res.status(401).json({error:'Unauthorized'});
  try {
    const state = await getState();
    const event = req.body || {};
    if (event.platforms) state.platforms = event.platforms;
    if (event.agents) state.agents = event.agents;
    if (event.meeting) state.meeting = event.meeting;
    if (event.gamePlan) state.gamePlan = event.gamePlan;
    if (event.opportunities) state.opportunities = event.opportunities;
    if (event.verdicts) state.verdicts = event.verdicts;
    if (event.analytics) state.analytics = event.analytics;
    if (event.activity) state.activity = [...event.activity, ...(state.activity || [])].slice(0,100);
    res.json({ok:true,state:await saveState(state)});
  } catch (e) { res.status(500).json({error:e.message}); }
});

app.post('/api/opportunities', async (req,res) => {
  if (!authorized(req)) return res.status(401).json({error:'Unauthorized'});
  try {
    const state = await getState();
    const item = {...req.body, id:req.body.id || `opp-${Date.now()}`, createdAt:new Date().toISOString()};
    state.opportunities = [item, ...(state.opportunities || []).filter(x => x.id !== 'seed-1')];
    state.activity = [{time:'Now',agent:'OPPORTUNITY',text:`New opportunity: ${item.brand || 'Unnamed lead'}`},...(state.activity || [])].slice(0,100);
    await saveState(state);
    res.json({ok:true,item});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get('/health', (_req,res) => res.json({ok:true, service:'dtl-war-room'}));
// SPA fallback. Express 5/path-to-regexp no longer accepts app.get('*').
// A pathless middleware fallback works for every unmatched browser route.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => app.listen(PORT, () => console.log(`DTL War Room listening on ${PORT}`))).catch(err => { console.error(err); process.exit(1); });
