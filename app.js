let STATE=null; let current='command';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const pct=(v,t)=>v==null?0:Math.max(0,Math.min(100,Math.round(v/t*100)));
async function load(){
  try {
    const r=await fetch('/api/state',{cache:'no-store'});
    if(!r.ok) throw new Error(`API ${r.status}`);
    const next=await r.json();
    if(!next || !Array.isArray(next.platforms) || !Array.isArray(next.agents)) throw new Error('Invalid state payload');
    STATE=next;
    renderPlatforms();
    render();
    const badge=document.querySelector('.live');
    if(badge) badge.innerHTML='<span></span> TEN AGENTS ACTIVE';
  } catch(err) {
    console.error('War Room load failed',err);
    const badge=document.querySelector('.live');
    if(badge) badge.textContent='WAR ROOM ONLINE · DATA RETRYING';
    const v=document.querySelector('#view');
    if(v) v.innerHTML=`<section class=\"card\"><div class=\"section-title\">WAR ROOM STATUS</div><h2>Dashboard is online</h2><p class=\"note\">The live data endpoint is reconnecting. The page will retry automatically.</p><div class=\"pitch\">${esc(err.message)}</div></section>`;
  }
}
function renderPlatforms(){document.querySelector('#platforms').innerHTML=STATE.platforms.map(p=>`<article class="card"><div class="platform-head"><div><div class="platform-name">${esc(p.name)}</div><div class="handle">${esc(p.handle)}</div></div><span class="pill">${esc(p.status)}</span></div><div class="big">${Number(p.followers).toLocaleString()}</div><div class="row"><span class="muted">Followers / subscribers</span><b>${Number(p.followerTarget).toLocaleString()}</b></div><div class="progress"><i style="width:${pct(p.followers,p.followerTarget)}%"></i></div><div class="metric"><div class="row"><span class="muted">${esc(p.metricLabel)}</span><b>${p.metricValue==null?'—':Number(p.metricValue).toLocaleString()} / ${Number(p.metricTarget).toLocaleString()}</b></div><div class="progress"><i style="width:${pct(p.metricValue,p.metricTarget)}%"></i></div>${p.metricValue==null?'<div class="data-missing">DATA NOT CONNECTED</div>':''}<div class="note">${esc(p.note)}</div></div></article>`).join('')}
function agentCards(){return `<div class="agent-grid">${STATE.agents.map(a=>`<div class="agent"><div class="avatar">${esc(a.initials)}</div><div class="status">${esc(a.status)}</div><h3>${esc(a.name)}</h3><div class="muted">${esc(a.role)}</div><p><b>NOW:</b> ${esc(a.current)}</p><p>${esc(a.finding)}</p><div class="row"><span class="muted">Confidence</span><b>${a.confidence}%</b></div></div>`).join('')}</div>`}
function activity(){return STATE.activity.map(x=>`<div class="activity-item"><b>${esc(x.agent)}</b>${esc(x.text)} <span class="muted">· ${esc(x.time)}</span></div>`).join('')}
function command(){return `<div class="grid"><section class="card span8"><div class="section-title">TEN-AGENT FLOOR</div>${agentCards()}</section><section class="card span4"><div class="section-title">LIVE ACTIVITY</div>${activity()}</section><section class="card span6"><div class="section-title">CURRENT GAME PLAN</div><div class="headline">${esc(STATE.gamePlan.headline)}</div>${STATE.gamePlan.postNow.map(x=>`<div class="post-now"><b>${esc(x.platform)}</b><div class="note">${esc(x.action)}</div></div>`).join('')}</section><section class="card span6"><div class="section-title">MEETING DECISION</div>${decision()}</section></div>`}
function decision(){const d=STATE.meeting.decision;return `<div class="decision-grid">${[['STOP',d.stop],['START',d.start],['KEEP',d.keep],['TEST',d.test],['NOW',d.immediate]].map(x=>`<div class="decision"><b>${x[0]}</b>${esc(x[1])}</div>`).join('')}</div>`}
function meeting(){let pos=[[4,7],[38,2],[72,7],[80,35],[72,68],[38,78],[4,68],[-2,35],[21,19],[58,19]];return `<section class="meeting-stage"><div class="table-core"><div><div class="eyebrow">DTL MEETING ROOM</div><h2>${esc(STATE.meeting.title)}</h2><div class="muted">${esc(STATE.meeting.status)}</div></div></div>${STATE.agents.map((a,i)=>{let msg=STATE.meeting.messages.find(m=>m.agent===a.name);return `<div class="meeting-agent" style="left:${pos[i][0]}%;top:${pos[i][1]}%"><div class="avatar">${esc(a.initials)}</div><b>${esc(a.name)}</b>${msg?`<div class="bubble">${esc(msg.text)}</div>`:''}</div>`}).join('')}</section><section class="card" style="margin-top:14px"><div class="section-title">CIO DECISION</div>${decision()}</section>`}
function opportunities(){return `<section class="card"><div class="row"><div><div class="section-title">REVENUE PIPELINE</div><h2>Opportunity Bot</h2></div><span class="pill">PAID → AFFILIATE → PRODUCT</span></div>${STATE.opportunities.map(o=>`<div class="opp"><div><h3>${esc(o.brand)}</h3><span class="pill">${esc(o.type)}</span><p class="note">${esc(o.why)}</p><div class="pitch">${esc(o.pitch)}</div></div><div><div class="muted">FIT</div><div class="fit">${esc(o.fit)}%</div></div><div><div class="muted">COMPENSATION</div><b>${esc(o.compensation)}</b><div class="note">${esc(o.contact)}</div></div><div><div class="muted">STATUS</div><span class="pill">${esc(o.status)}</span><div class="note">${esc(o.source)}</div></div></div>`).join('')}</section>`}
function gameplan(){return `<section class="card"><div class="section-title">IF DTL WERE POSTING TODAY</div><div class="headline">${esc(STATE.gamePlan.headline)}</div>${STATE.gamePlan.postNow.map(x=>`<div class="post-now"><b>${esc(x.platform)}</b><p>${esc(x.action)}</p></div>`).join('')}</section>`}
function render(){const v=document.querySelector('#view'); if(current==='command')v.innerHTML=command(); if(current==='agents')v.innerHTML=`<section class="card"><div class="section-title">INDIVIDUAL SPECIALISTS</div>${agentCards()}</section>`; if(current==='meeting')v.innerHTML=meeting(); if(current==='opportunities')v.innerHTML=opportunities(); if(current==='gameplan')v.innerHTML=gameplan(); if(current==='activity')v.innerHTML=`<section class="card"><div class="section-title">ACTIVITY LOG</div>${activity()}</section>`;}
document.querySelector('#tabs').addEventListener('click',e=>{if(!e.target.dataset.view)return;current=e.target.dataset.view;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b===e.target));render()});
load(); setInterval(load,30000);
