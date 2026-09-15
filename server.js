const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const PAGE = "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<title>DTL War Room</title>\n<style>:root{--bg:#070807;--panel:#0e100f;--panel2:#151815;--line:#272c28;--text:#f2f5f1;--muted:#8f9991;--good:#a7ff83;--warn:#f6d66b;--bad:#ff8a8a;--accent:#d9ffcc}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -20%,#1b221b 0,#090b09 34%,var(--bg) 70%);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}.shell{max-width:1500px;margin:auto;padding:28px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.eyebrow{font-size:11px;letter-spacing:.28em;color:var(--good);font-weight:800}.topbar h1{margin:3px 0 0;font-size:32px;letter-spacing:.04em}.live{border:1px solid var(--line);background:#0b0d0b;border-radius:999px;padding:10px 14px;font-size:11px;font-weight:800;letter-spacing:.12em}.live span{display:inline-block;width:8px;height:8px;background:var(--good);border-radius:50%;margin-right:8px;box-shadow:0 0 14px var(--good)}.platform-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.card{background:linear-gradient(180deg,#111411,#0b0d0b);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 14px 50px #0007}.platform-head,.row{display:flex;justify-content:space-between;gap:12px;align-items:center}.platform-name{font-size:18px;font-weight:900}.handle,.muted{color:var(--muted);font-size:12px}.big{font-size:28px;font-weight:900;margin:16px 0 4px}.progress{height:9px;background:#222622;border-radius:999px;overflow:hidden;margin:8px 0}.progress i{display:block;height:100%;background:linear-gradient(90deg,#5c7a53,var(--good));border-radius:999px}.metric{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}.data-missing{color:var(--warn);font-weight:800;font-size:12px}.tabs{display:flex;gap:8px;overflow:auto;margin:20px 0 14px;padding-bottom:4px}.tabs button{border:1px solid var(--line);background:#0c0e0c;color:var(--muted);border-radius:999px;padding:10px 14px;font-size:11px;font-weight:900;letter-spacing:.08em;white-space:nowrap;cursor:pointer}.tabs button.active{color:#071006;background:var(--good);border-color:var(--good)}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.span8{grid-column:span 8}.span4{grid-column:span 4}.span6{grid-column:span 6}.section-title{font-size:12px;letter-spacing:.13em;color:var(--muted);font-weight:900;margin-bottom:14px}.agent-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.agent{padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--panel);min-width:0}.avatar{width:46px;height:46px;border-radius:50%;background:#000;border:1px solid #3a403b;display:grid;place-items:center;font-weight:900;margin-bottom:12px}.agent h3{font-size:13px;margin:0 0 4px}.agent p{font-size:12px;color:var(--muted);line-height:1.5;margin:8px 0}.status{font-size:10px;color:var(--good);font-weight:900;letter-spacing:.1em}.current-task{margin:14px 0 10px;padding:12px;border:1px solid #344034;border-radius:13px;background:linear-gradient(180deg,#111811,#0a0d0a)}.task-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:9px}.task-label{font-size:9px;font-weight:1000;letter-spacing:.14em;color:var(--good)}.task-type{font-size:8px;font-weight:900;letter-spacing:.08em;border:1px solid #3a463a;border-radius:999px;padding:4px 7px;color:#dce7dc;white-space:nowrap}.task-target{font-size:13px;font-weight:900;line-height:1.28;color:#fff;overflow-wrap:anywhere}.task-meta{font-size:10px;color:var(--good);margin-top:5px;line-height:1.35}.task-detail{font-size:11px;color:var(--muted);margin-top:7px;line-height:1.42}.task-time{font-size:9px;color:#667067;margin-top:8px}.agent-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.agent-top .avatar{margin-bottom:0}.agent-id{flex:1;min-width:0}.finding{padding-top:9px;border-top:1px solid var(--line)}.activity-item{padding:12px 0;border-bottom:1px solid var(--line);font-size:13px}.activity-item b{color:var(--good);font-size:11px;margin-right:8px}.meeting-stage{min-height:580px;position:relative;background:radial-gradient(circle at center,#182018,#0a0c0a 55%,#070807);border:1px solid var(--line);border-radius:22px;overflow:hidden;padding:30px}.table-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:260px;height:150px;border:1px solid #394039;border-radius:50%;background:#0e110e;display:grid;place-items:center;text-align:center}.meeting-agent{position:absolute;width:190px}.meeting-agent .bubble{background:#151915;border:1px solid #303630;border-radius:14px;padding:10px;font-size:11px;line-height:1.4;color:#dce3dc;margin-top:7px}.meeting-agent .avatar{margin:0}.decision-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}.decision{border:1px solid var(--line);border-radius:14px;padding:14px;background:#0d0f0d}.decision b{display:block;font-size:10px;color:var(--good);letter-spacing:.1em;margin-bottom:7px}.opp{display:grid;grid-template-columns:1.3fr .7fr .7fr .8fr;gap:12px;padding:16px 0;border-bottom:1px solid var(--line);align-items:start}.pill{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;letter-spacing:.08em}.fit{font-size:22px;font-weight:900;color:var(--good)}.pitch{white-space:pre-wrap;background:#080a08;border:1px solid var(--line);padding:14px;border-radius:12px;color:#cdd5ce;font-size:12px;line-height:1.55;margin-top:10px}.post-now{padding:14px;border:1px solid var(--line);border-radius:14px;margin-bottom:10px}.post-now b{color:var(--good)}.headline{font-size:32px;max-width:800px;line-height:1.08;margin:8px 0 22px}.scanner{margin:16px 0 18px;padding:15px;border:1px solid #344034;border-radius:14px;background:linear-gradient(180deg,#101710,#090c09)}.scanner-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px}.scanner-stat{padding:10px;border:1px solid var(--line);border-radius:12px;background:#090b09}.scanner-stat b{display:block;font-size:16px;margin-top:3px}.scan-live{color:var(--good);font-weight:900;letter-spacing:.08em}.scan-btn{border:1px solid var(--good);background:var(--good);color:#071006;border-radius:999px;padding:9px 13px;font-size:10px;font-weight:1000;letter-spacing:.08em;cursor:pointer}.scan-btn:disabled{opacity:.45;cursor:wait}.source-link{display:inline-block;margin-top:8px;color:var(--good);font-size:10px;font-weight:800;text-decoration:none}.source-link:hover{text-decoration:underline}.note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:10px}@media(max-width:1000px){.platform-grid{grid-template-columns:1fr}.agent-grid{grid-template-columns:repeat(2,1fr)}.span8,.span4,.span6{grid-column:span 12}.decision-grid{grid-template-columns:1fr}.opp{grid-template-columns:1fr 1fr}.meeting-stage{min-height:auto}.meeting-agent,.table-core{position:static;transform:none;width:auto;height:auto;margin:10px 0}.meeting-stage{display:block}}@media(max-width:700px){.scanner-grid{grid-template-columns:1fr 1fr}.scanner-stat:last-child{grid-column:span 2}}@media(max-width:600px){.shell{padding:16px}.topbar{align-items:flex-start}.live{font-size:9px}.agent-grid{grid-template-columns:1fr}.opp{grid-template-columns:1fr}.headline{font-size:25px}}\n</style>\n</head>\n<body>\n<div class=\"shell\">\n  <header class=\"topbar\">\n    <div><div class=\"eyebrow\">DOWN THE LINE</div><h1>WAR ROOM</h1></div>\n    <div class=\"live\"><span></span> TEN AGENTS ACTIVE</div>\n  </header>\n  <section id=\"platforms\" class=\"platform-grid\"></section>\n  <nav class=\"tabs\" id=\"tabs\">\n    <button class=\"active\" data-view=\"command\">COMMAND</button><button data-view=\"agents\">AGENTS</button><button data-view=\"meeting\">MEETING ROOM</button><button data-view=\"opportunities\">OPPORTUNITIES</button><button data-view=\"gameplan\">GAME PLAN</button><button data-view=\"activity\">ACTIVITY</button>\n  </nav>\n  <main id=\"view\"><section class=\"card\"><div class=\"section-title\">WAR ROOM</div><h2>Loading DTL command center\u2026</h2><p class=\"note\">Connecting to agent state.</p></section></main>\n</div>\n<script>let STATE=null; let current='command';\nconst esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#039;'}[m]));\nconst pct=(v,t)=>v==null?0:Math.max(0,Math.min(100,Math.round(v/t*100)));\nasync function load(){\n  try {\n    const r=await fetch('/api/state',{cache:'no-store'});\n    if(!r.ok) throw new Error(`API ${r.status}`);\n    const next=await r.json();\n    if(!next || !Array.isArray(next.platforms) || !Array.isArray(next.agents)) throw new Error('Invalid state payload');\n    STATE=next;\n    renderPlatforms();\n    render();\n    const badge=document.querySelector('.live');\n    if(badge) badge.innerHTML='<span></span> TEN AGENTS ACTIVE';\n  } catch(err) {\n    console.error('War Room load failed',err);\n    const badge=document.querySelector('.live');\n    if(badge) badge.textContent='WAR ROOM ONLINE \u00b7 DATA RETRYING';\n    const v=document.querySelector('#view');\n    if(v) v.innerHTML=`<section class=\\\"card\\\"><div class=\\\"section-title\\\">WAR ROOM STATUS</div><h2>Dashboard is online</h2><p class=\\\"note\\\">The live data endpoint is reconnecting. The page will retry automatically.</p><div class=\\\"pitch\\\">${esc(err.message)}</div></section>`;\n  }\n}\nfunction renderPlatforms(){document.querySelector('#platforms').innerHTML=STATE.platforms.map(p=>`<article class=\"card\"><div class=\"platform-head\"><div><div class=\"platform-name\">${esc(p.name)}</div><div class=\"handle\">${esc(p.handle)}</div></div><span class=\"pill\">${esc(p.status)}</span></div><div class=\"big\">${Number(p.followers).toLocaleString()}</div><div class=\"row\"><span class=\"muted\">Followers / subscribers</span><b>${Number(p.followerTarget).toLocaleString()}</b></div><div class=\"progress\"><i style=\"width:${pct(p.followers,p.followerTarget)}%\"></i></div><div class=\"metric\"><div class=\"row\"><span class=\"muted\">${esc(p.metricLabel)}</span><b>${p.metricValue==null?'\u2014':Number(p.metricValue).toLocaleString()} / ${Number(p.metricTarget).toLocaleString()}</b></div><div class=\"progress\"><i style=\"width:${pct(p.metricValue,p.metricTarget)}%\"></i></div>${p.metricValue==null?'<div class=\"data-missing\">DATA NOT CONNECTED</div>':''}<div class=\"note\">${esc(p.note)}</div></div></article>`).join('')}\nfunction agentCards(){return `<div class=\"agent-grid\">${STATE.agents.map(a=>{const type=a.taskType||a.status||'STANDBY';const target=a.targetTitle||a.videoTitle||a.target||a.current||'Awaiting assignment';const targetKind=a.targetKind||((a.videoTitle||a.videoUrl)?'VIDEO':'TARGET');const platform=a.platform||a.targetPlatform||'Cross-platform';const detail=a.currentlyDoing||a.current||'Waiting for the next assignment.';const stamp=a.taskUpdatedAt||a.updatedAt||STATE.meta?.updatedAt||'';return `<div class=\"agent\"><div class=\"agent-top\"><div class=\"avatar\">${esc(a.initials)}</div><div class=\"agent-id\"><div class=\"status\">${esc(a.status)}</div><h3>${esc(a.name)}</h3><div class=\"muted\">${esc(a.role)}</div></div></div><div class=\"current-task\"><div class=\"task-head\"><span class=\"task-label\">CURRENTLY DOING</span><span class=\"task-type\">${esc(type)}</span></div><div class=\"task-target\">${esc(targetKind)}: ${esc(target)}</div><div class=\"task-meta\">${esc(platform)}</div><div class=\"task-detail\">${esc(detail)}</div>${stamp?`<div class=\"task-time\">Last task update: ${esc(stamp)}</div>`:''}</div><p class=\"finding\">${esc(a.finding)}</p><div class=\"row\"><span class=\"muted\">Confidence</span><b>${a.confidence}%</b></div></div>`}).join('')}</div>`}\nfunction activity(){return STATE.activity.map(x=>`<div class=\"activity-item\"><b>${esc(x.agent)}</b>${esc(x.text)} <span class=\"muted\">\u00b7 ${esc(x.time)}</span></div>`).join('')}\nfunction command(){return `<div class=\"grid\"><section class=\"card span8\"><div class=\"section-title\">TEN-AGENT FLOOR</div>${agentCards()}</section><section class=\"card span4\"><div class=\"section-title\">LIVE ACTIVITY</div>${activity()}</section><section class=\"card span6\"><div class=\"section-title\">CURRENT GAME PLAN</div><div class=\"headline\">${esc(STATE.gamePlan.headline)}</div>${STATE.gamePlan.postNow.map(x=>`<div class=\"post-now\"><b>${esc(x.platform)}</b><div class=\"note\">${esc(x.action)}</div></div>`).join('')}</section><section class=\"card span6\"><div class=\"section-title\">MEETING DECISION</div>${decision()}</section></div>`}\nfunction decision(){const d=STATE.meeting.decision;return `<div class=\"decision-grid\">${[['STOP',d.stop],['START',d.start],['KEEP',d.keep],['TEST',d.test],['NOW',d.immediate]].map(x=>`<div class=\"decision\"><b>${x[0]}</b>${esc(x[1])}</div>`).join('')}</div>`}\nfunction meeting(){let pos=[[4,7],[38,2],[72,7],[80,35],[72,68],[38,78],[4,68],[-2,35],[21,19],[58,19]];return `<section class=\"meeting-stage\"><div class=\"table-core\"><div><div class=\"eyebrow\">DTL MEETING ROOM</div><h2>${esc(STATE.meeting.title)}</h2><div class=\"muted\">${esc(STATE.meeting.status)}</div></div></div>${STATE.agents.map((a,i)=>{let msg=STATE.meeting.messages.find(m=>m.agent===a.name);return `<div class=\"meeting-agent\" style=\"left:${pos[i][0]}%;top:${pos[i][1]}%\"><div class=\"avatar\">${esc(a.initials)}</div><b>${esc(a.name)}</b>${msg?`<div class=\"bubble\">${esc(msg.text)}</div>`:''}</div>`}).join('')}</section><section class=\"card\" style=\"margin-top:14px\"><div class=\"section-title\">CIO DECISION</div>${decision()}</section>`}\nfunction opportunities(){const s=STATE.opportunityScanner||{};const opps=Array.isArray(STATE.opportunities)?STATE.opportunities:[];const status=s.status||'STARTING';const last=s.lastScanAt?new Date(s.lastScanAt).toLocaleString():'Not scanned yet';const next=s.nextScanAt?new Date(s.nextScanAt).toLocaleString():'Starting soon';return `<section class=\"card\"><div class=\"row\"><div><div class=\"section-title\">REVENUE PIPELINE</div><h2>Opportunity Bot</h2></div><span class=\"pill\">PAID \u2192 AFFILIATE \u2192 PRODUCT</span></div><div class=\"scanner\"><div class=\"row\"><div><div class=\"scan-live\">\u25cf ${esc(status)}</div><div class=\"note\">${esc(s.currentAction||'Preparing public opportunity sources\u2026')}</div></div><button class=\"scan-btn\" id=\"scanNow\" ${status==='SCANNING'?'disabled':''}>${status==='SCANNING'?'SCANNING\u2026':'SCAN NOW'}</button></div><div class=\"scanner-grid\"><div class=\"scanner-stat\"><span class=\"muted\">LAST SCAN</span><b>${esc(last)}</b></div><div class=\"scanner-stat\"><span class=\"muted\">NEXT SCAN</span><b>${esc(next)}</b></div><div class=\"scanner-stat\"><span class=\"muted\">SOURCES CHECKED</span><b>${esc(s.sourcesChecked??0)}</b></div><div class=\"scanner-stat\"><span class=\"muted\">SIGNALS FOUND</span><b>${esc(s.signalsFound??0)}</b></div><div class=\"scanner-stat\"><span class=\"muted\">SCAN CYCLES</span><b>${esc(s.cycles??0)}</b></div></div>${s.lastError?`<div class=\"note\" style=\"color:var(--warn)\">Last source issue: ${esc(s.lastError)}</div>`:''}</div>${opps.length?opps.map(o=>`<div class=\"opp\"><div><h3>${esc(o.brand)}</h3><span class=\"pill\">${esc(o.type)}</span><p class=\"note\">${esc(o.why)}</p><div class=\"pitch\">${esc(o.pitch)}</div>${o.sourceUrl?`<a class=\"source-link\" href=\"${esc(o.sourceUrl)}\" target=\"_blank\" rel=\"noopener noreferrer\">OPEN SOURCE \u2197</a>`:''}</div><div><div class=\"muted\">FIT</div><div class=\"fit\">${esc(o.fit)}%</div></div><div><div class=\"muted\">COMPENSATION</div><b>${esc(o.compensation)}</b><div class=\"note\">${esc(o.contact)}</div></div><div><div class=\"muted\">STATUS</div><span class=\"pill\">${esc(o.status)}</span><div class=\"note\">${esc(o.source)}</div></div></div>`).join(''):'<div class=\"note\">No opportunity signals stored yet. The scanner is still checking public sources.</div>'}</section>`}\nfunction gameplan(){return `<section class=\"card\"><div class=\"section-title\">IF DTL WERE POSTING TODAY</div><div class=\"headline\">${esc(STATE.gamePlan.headline)}</div>${STATE.gamePlan.postNow.map(x=>`<div class=\"post-now\"><b>${esc(x.platform)}</b><p>${esc(x.action)}</p></div>`).join('')}</section>`}\nfunction render(){const v=document.querySelector('#view'); if(current==='command')v.innerHTML=command(); if(current==='agents')v.innerHTML=`<section class=\"card\"><div class=\"section-title\">INDIVIDUAL SPECIALISTS</div>${agentCards()}</section>`; if(current==='meeting')v.innerHTML=meeting(); if(current==='opportunities')v.innerHTML=opportunities(); if(current==='gameplan')v.innerHTML=gameplan(); if(current==='activity')v.innerHTML=`<section class=\"card\"><div class=\"section-title\">ACTIVITY LOG</div>${activity()}</section>`;}\nasync function triggerOpportunityScan(){const b=document.querySelector('#scanNow');if(b){b.disabled=true;b.textContent='SCANNING\u2026'}try{const r=await fetch('/api/opportunity-scan',{method:'POST'});if(!r.ok)throw new Error(`Scan API ${r.status}`);await load()}catch(err){console.error(err);if(b){b.disabled=false;b.textContent='RETRY SCAN'}}}\ndocument.querySelector('#tabs').addEventListener('click',e=>{if(!e.target.dataset.view)return;current=e.target.dataset.view;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b===e.target));render()});\ndocument.querySelector('#view').addEventListener('click',e=>{if(e.target&&e.target.id==='scanNow')triggerOpportunityScan()});\nload(); setInterval(load,30000);\n</script>\n</body>\n</html>";
const TASK_SCHEMA_VERSION = 3;
const AGENT_TASK_DEFAULTS = {"hook":{"status":"Watching","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Watching the actual episode opening and grading the first 30 seconds for clarity, curiosity and scroll-stopping strength.","taskSource":"DTL video review"},"retention":{"status":"Watching","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"Best Dorito Ever?","platform":"TikTok \u2022 @down.the.line.pod","currentlyDoing":"Watching the clip start to finish and marking where pacing slows, where attention resets and where the payoff lands.","taskSource":"DTL video review"},"content":{"status":"Watching","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"KHLOE KARDASHIANS POPCORN?","platform":"Instagram Reels \u2022 @down.the.line.pod","currentlyDoing":"Watching the Reel for standalone value, topic clarity and whether the premise works without full-episode context.","taskSource":"DTL video review"},"packaging":{"status":"Analyzing","taskType":"Analyzing DTL video","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Analyzing the title/thumbnail promise against the video topic and identifying a stronger packaging angle if needed.","taskSource":"DTL packaging review"},"performance":{"status":"Analyzing","taskType":"Analyzing DTL data","targetKind":"DTL VIDEO DATA","targetTitle":"Best Dorito Ever?","platform":"Cross-platform","currentlyDoing":"Comparing the clip\u2019s available public performance signals across DTL platforms and looking for a repeatable distribution pattern.","taskSource":"DTL performance review"},"discovery":{"status":"Testing","taskType":"Testing DTL format","targetKind":"DTL VIDEO","targetTitle":"KHLOE KARDASHIANS POPCORN?","platform":"TikTok + Instagram","currentlyDoing":"Testing which posting window, caption structure and clip framing should be reused for similar DTL food/pop-culture moments.","taskSource":"DTL experiment"},"algorithm":{"status":"Researching","taskType":"Researching for DTL","targetKind":"DTL TARGET","targetTitle":"Current platform guidance for the latest DTL clips","platform":"TikTok + Instagram + YouTube","currentlyDoing":"Researching current platform guidance and trend changes, then mapping only relevant findings back to DTL\u2019s latest uploads.","taskSource":"Platform research for DTL"},"competitive":{"status":"Researching","taskType":"Comparing patterns","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"Cross-platform","currentlyDoing":"Comparing the episode\u2019s strongest clipable moments with current winning structures in the same entertainment/gaming lane.","taskSource":"Competitive review for DTL"},"goal":{"status":"Tracking","taskType":"Tracking DTL goal","targetKind":"DTL CHANNEL DATA","targetTitle":"YouTube monetization progress","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Tracking which current DTL uploads can contribute most to qualified watch-time growth and the next monetization bottleneck.","taskSource":"DTL monetization tracking"},"opportunity":{"status":"Scanning","taskType":"LIVE opportunity scan","targetKind":"PUBLIC SOURCES","targetTitle":"Creator campaigns + sponsorship + affiliate + product seeding","platform":"Public web \u2022 DTL gaming / entertainment / food lanes","currentlyDoing":"Actively scanning public web and news results for DTL-fit paid sponsorships, affiliate programs, creator campaigns, product seeding and PR sample opportunities.","taskSource":"Automated Railway opportunity scanner"}};
function applyTaskSchema(input) {
  const state = input && typeof input === 'object' ? input : {};
  state.meta = state.meta || {};
  if (!Array.isArray(state.agents)) state.agents = [];
  const changed = Number(state.meta.taskSchemaVersion || 0) < TASK_SCHEMA_VERSION;
  state.agents = state.agents.map(agent => {
    const defaults = AGENT_TASK_DEFAULTS[agent.id];
    if (!defaults) return agent;
    const hasSpecificTarget = Boolean(agent.targetTitle && agent.platform && agent.currentlyDoing);
    if (hasSpecificTarget && !changed) return agent;
    return { ...agent, ...defaults, taskUpdatedAt: changed ? new Date().toISOString() : (agent.taskUpdatedAt || new Date().toISOString()) };
  });
  state.opportunityScanner = {
    status: 'STARTING',
    currentAction: 'Preparing public opportunity sources…',
    lastScanAt: null,
    nextScanAt: null,
    sourcesChecked: 0,
    signalsFound: 0,
    cycles: 0,
    lastError: null,
    ...(state.opportunityScanner || {})
  };
  if (changed) {
    state.meta.taskSchemaVersion = TASK_SCHEMA_VERSION;
    state.meta.updatedAt = new Date().toISOString();
    state.opportunityScanner.status = 'STARTING';
    state.opportunityScanner.currentAction = 'Starting first live opportunity scan…';
  }
  return state;
}

const SEED_STATE = {"meta":{"project":"Down The Line","updatedAt":"2026-09-15T13:45:00Z","mode":"seed","taskSchemaVersion":3},"platforms":[{"id":"tiktok","name":"TikTok","handle":"@down.the.line.pod","followers":913,"followerTarget":10000,"metricLabel":"Eligible views / 30d","metricValue":null,"metricTarget":100000,"status":"Tracking public count","note":"Creator Rewards requirements must be revalidated from official TikTok sources; private eligible-view data requires authorized analytics."},{"id":"instagram","name":"Instagram","handle":"@down.the.line.pod","followers":100,"followerTarget":500,"metricLabel":"Nearest native unlock","metricValue":100,"metricTarget":500,"status":"Gifts path","note":"Instagram has multiple monetization paths. This card tracks the nearest published follower-based native unlock, not a universal monetization threshold."},{"id":"youtube","name":"YouTube","handle":"@Down.The.Line.Podcast","followers":1540,"followerTarget":1000,"metricLabel":"Qualified watch hours / 365d","metricValue":null,"metricTarget":4000,"status":"Subscriber goal cleared","note":"Qualified watch hours are private analytics and remain DATA NOT CONNECTED until an authorized source provides them."}],"agents":[{"id":"hook","name":"HOOK","role":"Hook Specialist","initials":"HK","status":"Watching","current":"Opening strength across recent clips","confidence":82,"finding":"Make the premise understandable before the viewer has time to scroll.","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Watching the actual episode opening and grading the first 30 seconds for clarity, curiosity and scroll-stopping strength.","taskSource":"DTL video review","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"retention","name":"RETENTION","role":"Retention Specialist","initials":"RT","status":"Watching","current":"Pacing and payoff timing","confidence":76,"finding":"Track where setup stops adding value and move the payoff forward.","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"Best Dorito Ever?","platform":"TikTok \u2022 @down.the.line.pod","currentlyDoing":"Watching the clip start to finish and marking where pacing slows, where attention resets and where the payoff lands.","taskSource":"DTL video review","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"content","name":"CONTENT","role":"Content Specialist","initials":"CT","status":"Watching","current":"Topic and standalone clip value","confidence":79,"finding":"Prioritize moments that work without needing full-episode context.","taskType":"Watching DTL video","targetKind":"DTL VIDEO","targetTitle":"KHLOE KARDASHIANS POPCORN?","platform":"Instagram Reels \u2022 @down.the.line.pod","currentlyDoing":"Watching the Reel for standalone value, topic clarity and whether the premise works without full-episode context.","taskSource":"DTL video review","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"packaging","name":"PACKAGING","role":"Packaging Specialist","initials":"PK","status":"Analyzing","current":"Titles, captions and thumbnails","confidence":81,"finding":"Packaging should make one clear promise instead of describing everything.","taskType":"Analyzing DTL video","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Analyzing the title/thumbnail promise against the video topic and identifying a stronger packaging angle if needed.","taskSource":"DTL packaging review","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"performance","name":"PERFORMANCE","role":"Performance Specialist","initials":"PF","status":"Analyzing","current":"Cross-platform public performance","confidence":88,"finding":"Build a verified baseline before declaring a format a winner.","taskType":"Analyzing DTL data","targetKind":"DTL VIDEO DATA","targetTitle":"Best Dorito Ever?","platform":"Cross-platform","currentlyDoing":"Comparing the clip\u2019s available public performance signals across DTL platforms and looking for a repeatable distribution pattern.","taskSource":"DTL performance review","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"discovery","name":"DISCOVERY","role":"Discovery & Experiment Specialist","initials":"DS","status":"Testing","current":"Posting windows and format variables","confidence":71,"finding":"Change one major variable at a time so the team can learn what caused the result.","taskType":"Testing DTL format","targetKind":"DTL VIDEO","targetTitle":"KHLOE KARDASHIANS POPCORN?","platform":"TikTok + Instagram","currentlyDoing":"Testing which posting window, caption structure and clip framing should be reused for similar DTL food/pop-culture moments.","taskSource":"DTL experiment","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"algorithm","name":"ALGORITHM","role":"Algorithm & Trend Intelligence","initials":"AL","status":"Researching","current":"Platform guidance and current trends","confidence":77,"finding":"Treat trends as time-sensitive opportunities, not permanent rules.","taskType":"Researching for DTL","targetKind":"DTL TARGET","targetTitle":"Current platform guidance for the latest DTL clips","platform":"TikTok + Instagram + YouTube","currentlyDoing":"Researching current platform guidance and trend changes, then mapping only relevant findings back to DTL\u2019s latest uploads.","taskSource":"Platform research for DTL","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"competitive","name":"COMPETITIVE","role":"Competitive Pattern Specialist","initials":"CP","status":"Researching","current":"Winning patterns in DTL categories","confidence":74,"finding":"Adapt repeatable structures without copying creators.","taskType":"Comparing patterns","targetKind":"DTL VIDEO","targetTitle":"DTL Episode 26: D23 and GTA6","platform":"Cross-platform","currentlyDoing":"Comparing the episode\u2019s strongest clipable moments with current winning structures in the same entertainment/gaming lane.","taskSource":"Competitive review for DTL","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"goal","name":"GOAL","role":"Goal & Monetization Specialist","initials":"GL","status":"Tracking","current":"Monetization bottlenecks","confidence":90,"finding":"YouTube subscriber threshold is cleared; qualified watch-hour data is the missing monetization metric.","taskType":"Tracking DTL goal","targetKind":"DTL CHANNEL DATA","targetTitle":"YouTube monetization progress","platform":"YouTube \u2022 @Down.The.Line.Podcast","currentlyDoing":"Tracking which current DTL uploads can contribute most to qualified watch-time growth and the next monetization bottleneck.","taskSource":"DTL monetization tracking","taskUpdatedAt":"2026-09-15T13:35:00Z"},{"id":"opportunity","name":"OPPORTUNITY","role":"Revenue Opportunity Scout","initials":"OP","status":"Scanning","current":"Sponsors, affiliates and product seeding","confidence":75,"finding":"Pitch with the strongest verified category-specific DTL analytics, not generic vanity metrics.","taskType":"LIVE opportunity scan","targetKind":"PUBLIC SOURCES","targetTitle":"Creator campaigns + sponsorship + affiliate + product seeding","platform":"Public web \u2022 DTL gaming / entertainment / food lanes","currentlyDoing":"Actively scanning public web and news results for DTL-fit paid sponsorships, affiliate programs, creator campaigns, product seeding and PR sample opportunities.","taskSource":"Automated Railway opportunity scanner","taskUpdatedAt":"2026-09-15T13:45:00Z"}],"activity":[{"time":"Now","agent":"OPPORTUNITY","text":"Live opportunity scanner enabled. First public-source scan will run at server startup."},{"time":"Now","agent":"HOOK","text":"Watching DTL Episode 26: D23 and GTA6 on YouTube \u2014 reviewing the opening 30 seconds."},{"time":"Now","agent":"RETENTION","text":"Watching Best Dorito Ever? on TikTok \u2014 marking pacing and payoff timing."},{"time":"Now","agent":"CONTENT","text":"Watching KHLOE KARDASHIANS POPCORN? on Instagram Reels \u2014 checking standalone clip value."},{"time":"Now","agent":"GOAL","text":"Monetization tracker initialized with private-metric safeguards."},{"time":"Now","agent":"ALGORITHM","text":"POST NOW framework initialized for platform-specific recommendations."}],"meeting":{"title":"Strategy Meeting","status":"Ready for evidence","messages":[{"agent":"GOAL","text":"Our job is not just growth. Every recommendation should move a monetization bottleneck."},{"agent":"PERFORMANCE","text":"Agreed, but we only promote claims backed by measurements we actually collected."},{"agent":"OPPORTUNITY","text":"Give me verified category performance and I will turn it into the strongest truthful sponsor pitch."},{"agent":"DISCOVERY","text":"I want controlled tests so we can tell sponsors what repeatedly works, not what worked once."}],"decision":{"stop":"Using unverified numbers in external pitches","start":"Building category-specific evidence packages","keep":"Honest review positioning","test":"Which DTL categories create the strongest sponsor response","immediate":"Collect verified analytics and rank the first outreach opportunities"}},"gamePlan":{"headline":"Build evidence, then turn it into reach and revenue.","postNow":[{"platform":"TikTok","action":"Use a clear first-second premise, platform-relevant keywords, and only current relevant hashtags. Trend recommendations update when verified."},{"platform":"Instagram","action":"Package Reels for discovery while tracking the nearest native monetization unlock separately from long-term sponsorship value."},{"platform":"YouTube","action":"Subscriber goal is cleared. Prioritize long-form retention and qualified watch-hour growth while improving titles and thumbnails."}]},"opportunities":[{"id":"seed-1","brand":"Live opportunity scanner starting","type":"SYSTEM","fit":100,"status":"SCANNING","compensation":"Checking public sources","contact":"Official routes only","why":"The Opportunity bot now runs its own live scan on Railway instead of waiting for opportunities to be manually ingested.","pitch":"It will collect public opportunity signals, score DTL fit, attach the source link, and keep unverified compensation/contact details clearly labeled until confirmed.","source":"Automated scanner boot","sourceUrl":null}],"verdicts":[],"analytics":[],"opportunityScanner":{"status":"STARTING","currentAction":"Starting first live opportunity scan\u2026","lastScanAt":null,"nextScanAt":null,"sourcesChecked":0,"signalsFound":0,"cycles":0,"lastError":null}};
let memoryState = applyTaskSchema(JSON.parse(JSON.stringify(SEED_STATE)));
let pool = null;
let dbReady = false;
let server = null;
let opportunityScanTimer = null;
let opportunityScanInFlight = false;
const OPPORTUNITY_SCAN_INTERVAL_MS = Math.max(10, Number(process.env.OPPORTUNITY_SCAN_INTERVAL_MINUTES || 30)) * 60 * 1000;
const OPPORTUNITY_SCAN_QUERIES = [
  'creator sponsorship gaming creators open applications',
  'affiliate program gaming creators influencer',
  'food beverage creator campaign product seeding',
  'snack brand ambassador creator affiliate program',
  'podcast sponsorship creator campaign applications',
  'entertainment creator program paid partnership'
];

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
    const { rows } = await pool.query('SELECT id,payload FROM war_room_state WHERE id=1');
    if (!rows.length) {
      await pool.query('INSERT INTO war_room_state (id,payload) VALUES (1,$1)', [memoryState]);
    } else {
      const previousVersion = Number(rows[0]?.payload?.meta?.taskSchemaVersion || 0);
      const upgraded = applyTaskSchema(rows[0].payload);
      memoryState = upgraded;
      if (previousVersion < TASK_SCHEMA_VERSION) {
        await pool.query('UPDATE war_room_state SET payload=$1, updated_at=NOW() WHERE id=1', [upgraded]);
        console.log('Upgraded agent task schema to specific DTL video targets');
      }
    }
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
      if (rows[0]?.payload) return applyTaskSchema(rows[0].payload);
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
  if (dbReady && pool) {
    await pool.query('UPDATE war_room_state SET payload=$1, updated_at=NOW() WHERE id=1', [state]);
  }
  return state;
}

function authorized(req) {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function stripTags(value) {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function fetchText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'DTL-War-Room/1.3 (+public-opportunity-research)' }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRss(xml, sourceName, query) {
  const items = [];
  const matches = String(xml || '').match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of matches.slice(0, 10)) {
    const tag = name => {
      const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
      return m ? stripTags(m[1]) : '';
    };
    const title = tag('title');
    const link = tag('link');
    const pubDate = tag('pubDate');
    const publisher = tag('source') || sourceName;
    if (title && link) items.push({ title, link, pubDate, publisher, sourceName, query });
  }
  return items;
}

function parseDuckDuckGo(html, query) {
  const items = [];
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(String(html || ''))) && items.length < 10) {
    let link = decodeEntities(match[1]);
    const title = stripTags(match[2]);
    try {
      const u = new URL(link, 'https://duckduckgo.com');
      const uddg = u.searchParams.get('uddg');
      if (uddg) link = decodeURIComponent(uddg);
    } catch (_) {}
    if (title && /^https?:\/\//i.test(link)) items.push({ title, link, pubDate: '', publisher: 'Public web result', sourceName: 'DuckDuckGo', query });
  }
  return items;
}

function opportunityType(title, query) {
  const s = `${title} ${query}`.toLowerCase();
  if (/affiliate|commission/.test(s)) return 'AFFILIATE';
  if (/seed|sample|pr package|free product/.test(s)) return 'PRODUCT / PR';
  if (/ambassador/.test(s)) return 'AMBASSADOR';
  if (/sponsor|paid partnership|paid campaign/.test(s)) return 'PAID / SPONSOR';
  if (/creator program|influencer campaign|creator campaign/.test(s)) return 'CREATOR CAMPAIGN';
  return 'LIVE SIGNAL';
}

function scoreOpportunity(title, query) {
  const s = `${title} ${query}`.toLowerCase();
  let score = 52;
  if (/sponsor|paid partnership|paid campaign|affiliate|ambassador|creator program|creator campaign|product seeding|sample/.test(s)) score += 16;
  if (/gaming|game|gta|entertainment|podcast|food|snack|beverage|review/.test(s)) score += 12;
  if (/apply|application|open|seeking|looking for|launch|program/.test(s)) score += 8;
  if (/creator|influencer/.test(s)) score += 6;
  return Math.max(50, Math.min(96, score));
}

function makeOpportunitySignal(item) {
  const type = opportunityType(item.title, item.query);
  const fit = scoreOpportunity(item.title, item.query);
  const cleanHost = (() => { try { return new URL(item.link).hostname.replace(/^www\./,''); } catch (_) { return item.publisher || 'Public source'; } })();
  return {
    id: `scan-${Buffer.from(`${item.link}|${item.title}`).toString('base64url').slice(0, 24)}`,
    brand: item.title.slice(0, 170),
    type,
    fit,
    status: fit >= 84 ? 'HIGH PRIORITY SIGNAL' : 'NEW SIGNAL',
    compensation: 'Not publicly verified yet',
    contact: 'Official source/application route',
    why: `Matched DTL opportunity search: “${item.query}”. This is a public lead signal, not a claimed partnership.`,
    pitch: 'Review the linked source first. If the program is open and DTL meets eligibility, prepare outreach using verified DTL metrics and an honest-review disclosure.',
    source: `${item.sourceName} • ${cleanHost}${item.pubDate ? ` • ${item.pubDate}` : ''}`,
    sourceUrl: item.link,
    createdAt: new Date().toISOString(),
    scanQuery: item.query
  };
}

async function runOpportunityScan(trigger = 'scheduled') {
  if (opportunityScanInFlight) return { ok: true, skipped: true, reason: 'scan already running' };
  opportunityScanInFlight = true;
  const started = new Date();
  let state = await getState();
  state = applyTaskSchema(state);
  state.opportunityScanner = {
    ...(state.opportunityScanner || {}),
    status: 'SCANNING',
    currentAction: 'Searching public web + news sources for DTL-fit creator revenue opportunities…',
    lastError: null
  };
  const opportunityAgent = (state.agents || []).find(a => a.id === 'opportunity');
  if (opportunityAgent) {
    opportunityAgent.status = 'Scanning';
    opportunityAgent.taskType = 'LIVE opportunity scan';
    opportunityAgent.targetKind = 'PUBLIC SOURCES';
    opportunityAgent.targetTitle = 'Creator campaigns + sponsorship + affiliate + product seeding';
    opportunityAgent.currentlyDoing = 'Scanning current public sources now. Each result is source-linked and stays a lead signal until terms/contact are verified.';
    opportunityAgent.taskUpdatedAt = started.toISOString();
  }
  state.activity = [{ time: 'Now', agent: 'OPPORTUNITY', text: `Started ${trigger} opportunity scan across public web/news sources.` }, ...(state.activity || [])].slice(0, 100);
  await saveState(state);

  let sourcesChecked = 0;
  const raw = [];
  const errors = [];
  try {
    for (const query of OPPORTUNITY_SCAN_QUERIES) {
      const encoded = encodeURIComponent(query);
      const tasks = [
        (async () => {
          try {
            const xml = await fetchText(`https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`);
            sourcesChecked += 1;
            raw.push(...parseRss(xml, 'Google News', query));
          } catch (err) { errors.push(`Google News: ${err.message}`); }
        })(),
        (async () => {
          try {
            const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encoded}`);
            sourcesChecked += 1;
            raw.push(...parseDuckDuckGo(html, query));
          } catch (err) { errors.push(`Public web: ${err.message}`); }
        })()
      ];
      await Promise.all(tasks);
    }

    const unique = new Map();
    for (const item of raw) {
      const key = `${item.link}`.toLowerCase();
      if (!unique.has(key)) unique.set(key, item);
    }
    const ranked = [...unique.values()]
      .map(makeOpportunitySignal)
      .filter(x => x.fit >= 66)
      .sort((a,b) => b.fit - a.fit)
      .slice(0, 18);

    state = await getState();
    state = applyTaskSchema(state);
    const existing = Array.isArray(state.opportunities) ? state.opportunities.filter(x => x.id !== 'seed-1') : [];
    const merged = new Map();
    for (const item of [...ranked, ...existing]) {
      const key = item.sourceUrl || item.id || item.brand;
      if (!merged.has(key)) merged.set(key, item);
    }
    state.opportunities = [...merged.values()].slice(0, 40);
    const finished = new Date();
    state.opportunityScanner = {
      ...(state.opportunityScanner || {}),
      status: 'WATCHING',
      currentAction: ranked.length
        ? `Scan complete. Reviewing ${ranked.length} new public lead signals and waiting for the next cycle.`
        : 'Scan complete. No strong new public lead signals passed the fit filter this cycle.',
      lastScanAt: finished.toISOString(),
      nextScanAt: new Date(finished.getTime() + OPPORTUNITY_SCAN_INTERVAL_MS).toISOString(),
      sourcesChecked,
      signalsFound: ranked.length,
      cycles: Number(state.opportunityScanner?.cycles || 0) + 1,
      lastError: errors.length ? errors.slice(0, 2).join(' | ') : null
    };
    const agent = (state.agents || []).find(a => a.id === 'opportunity');
    if (agent) {
      agent.status = 'Watching';
      agent.targetKind = 'PUBLIC OPPORTUNITY PIPELINE';
      agent.targetTitle = ranked.length ? `${ranked.length} new signals from latest scan` : 'No new strong signals this cycle';
      agent.currentlyDoing = `Latest scan checked ${sourcesChecked} public result sources. ${ranked.length} new signals passed the DTL-fit filter; continuing automatically every ${Math.round(OPPORTUNITY_SCAN_INTERVAL_MS/60000)} minutes.`;
      agent.taskUpdatedAt = finished.toISOString();
    }
    state.activity = [{ time: 'Now', agent: 'OPPORTUNITY', text: `Scan finished: ${sourcesChecked} sources checked, ${ranked.length} new DTL-fit signals found.${errors.length ? ' Some sources were temporarily unavailable.' : ''}` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    return { ok: true, sourcesChecked, signalsFound: ranked.length, errors };
  } catch (err) {
    state = await getState();
    state.opportunityScanner = {
      ...(state.opportunityScanner || {}),
      status: 'RETRYING',
      currentAction: 'Opportunity scan hit a source error; it will retry automatically.',
      lastScanAt: new Date().toISOString(),
      nextScanAt: new Date(Date.now() + OPPORTUNITY_SCAN_INTERVAL_MS).toISOString(),
      lastError: err.message,
      cycles: Number(state.opportunityScanner?.cycles || 0) + 1
    };
    state.activity = [{ time: 'Now', agent: 'OPPORTUNITY', text: `Opportunity scan error: ${err.message}. Automatic retry remains enabled.` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    return { ok: false, error: err.message };
  } finally {
    opportunityScanInFlight = false;
  }
}

function startOpportunityScanner() {
  if (opportunityScanTimer) clearInterval(opportunityScanTimer);
  setTimeout(() => runOpportunityScan('startup').catch(err => console.error('Startup opportunity scan failed:', err.message)), 2500).unref();
  opportunityScanTimer = setInterval(() => runOpportunityScan('scheduled').catch(err => console.error('Scheduled opportunity scan failed:', err.message)), OPPORTUNITY_SCAN_INTERVAL_MS);
  opportunityScanTimer.unref();
}


app.get('/health', (_req, res) => res.status(200).json({
  ok: true,
  service: 'dtl-war-room',
  database: dbReady ? 'connected' : 'memory-fallback',
  frontend: 'embedded-v7-live-opportunity-scanner',
  time: new Date().toISOString()
}));

app.get('/api/state', async (_req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json(await getState());
  } catch (err) {
    console.error('State endpoint failed:', err);
    res.status(500).json({ error: 'Unable to load War Room state', detail: err.message });
  }
});

app.post('/api/ingest', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const state = await getState();
    const event = req.body || {};
    for (const key of ['platforms','agents','meeting','gamePlan','opportunities','verdicts','analytics']) {
      if (event[key] !== undefined) state[key] = event[key];
    }
    if (event.activity) state.activity = [...event.activity, ...(state.activity || [])].slice(0, 100);
    res.json({ ok: true, state: await saveState(state) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents/:id', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const state = await getState();
    const id = String(req.params.id || '').toLowerCase();
    const index = (state.agents || []).findIndex(a => String(a.id).toLowerCase() === id);
    if (index < 0) return res.status(404).json({ error: 'Agent not found' });
    const patch = req.body || {};
    const updated = { ...state.agents[index], ...patch, id: state.agents[index].id, taskUpdatedAt: new Date().toISOString() };
    state.agents[index] = updated;
    state.activity = [{ time: 'Now', agent: updated.name, text: `Current task updated: ${updated.targetTitle || updated.videoTitle || updated.current || 'assignment changed'}` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    res.json({ ok: true, agent: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/opportunity-scan', async (_req, res) => {
  try {
    if (opportunityScanInFlight) return res.status(202).json({ ok: true, status: 'already-scanning' });
    const result = await runOpportunityScan('manual');
    res.status(result.ok ? 200 : 502).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/opportunities', async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const state = await getState();
    const body = req.body || {};
    const item = { ...body, id: body.id || `opp-${Date.now()}`, createdAt: new Date().toISOString() };
    state.opportunities = [item, ...(state.opportunities || []).filter(x => x.id !== 'seed-1')];
    state.activity = [{ time: 'Now', agent: 'OPPORTUNITY', text: `New opportunity: ${item.brand || 'Unnamed lead'}` }, ...(state.activity || [])].slice(0, 100);
    await saveState(state);
    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Frontend is embedded in this file so Railway cannot fail because a /public folder was missed during upload.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.status(200).type('html').send(PAGE);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

server = app.listen(PORT, HOST, () => {
  console.log(`DTL War Room listening on http://${HOST}:${PORT}`);
  tryInitDb().finally(startOpportunityScanner);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down cleanly`);
  if (opportunityScanTimer) clearInterval(opportunityScanTimer);
  if (server) server.close(async () => {
    try { if (pool) await pool.end(); } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
