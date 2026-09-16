const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const PAGE = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');

const WORKER_BACKEND_PORT = Number(process.env.DTL_WORKER_BACKEND_PORT || 3101);
const WORKER_BACKEND_URL = process.env.DTL_WORKER_BACKEND_URL || 'https://raw.githubusercontent.com/DigiJuice94/Down-the-line/a9d256ac1ea9893e419445237e280ea16b22efbb/server.js';
let workerChild = null;
let workerSyncTimer = null;
let workerBackendAlive = false;
let workerBackendLastSync = null;
let workerBackendLastError = null;
let shuttingDown = false;

async function ensureWorkerBackendFile(){
  const workerFile=path.join(__dirname,'worker-backend.js');
  if(fs.existsSync(workerFile)&&fs.statSync(workerFile).size>10000)return workerFile;
  const alternate=path.join(__dirname,'bgutil-ytdlp-pot-provider','server','worker-backend.js');
  if(fs.existsSync(alternate)&&fs.statSync(alternate).size>10000){fs.copyFileSync(alternate,workerFile);return workerFile}
  console.log('worker-backend.js missing; downloading known-good worker engine at runtime…');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const r=await fetch(WORKER_BACKEND_URL,{redirect:'follow',signal:controller.signal,headers:{'user-agent':'DTL-War-Room/2.0'}});
    if(!r.ok)throw new Error(`backend download HTTP ${r.status}`);
    const text=await r.text();
    if(text.length<10000||!text.includes('runCoreWorkerCycle'))throw new Error('downloaded backend did not pass integrity check');
    fs.writeFileSync(workerFile,text);
    console.log(`Recovered worker backend (${text.length} bytes).`);
    return workerFile;
  }finally{clearTimeout(timer)}
}

async function startWorkerBackend(){
  try{
    const workerFile=await ensureWorkerBackendFile();
    if(workerChild && !workerChild.killed) return;
    const env={...process.env,PORT:String(WORKER_BACKEND_PORT),DTL_WORKER_INTERVAL_MINUTES:String(process.env.DTL_WORKER_INTERVAL_MINUTES||10),OPPORTUNITY_SCAN_INTERVAL_MINUTES:String(process.env.OPPORTUNITY_SCAN_INTERVAL_MINUTES||20)};
    workerChild=spawn(process.execPath,[workerFile],{cwd:__dirname,env,stdio:['ignore','inherit','inherit']});
    console.log(`Real worker backend started on internal port ${WORKER_BACKEND_PORT}`);
    workerChild.on('exit',(code,signal)=>{
      console.log(`Real worker backend exited code=${code} signal=${signal}`);
      workerBackendAlive=false;workerBackendLastError=`worker process exited code=${code} signal=${signal}`;workerChild=null;
      if(!shuttingDown) setTimeout(()=>startWorkerBackend().catch(e=>console.error('worker restart failed',e.message)),5000).unref();
    });
  }catch(err){workerBackendAlive=false;workerBackendLastError=String(err.message||err);console.error('Unable to start real worker backend:',err.message);if(!shuttingDown)setTimeout(()=>startWorkerBackend().catch(()=>{}),15000).unref()}
}

async function proxyWorker(pathname,method='POST'){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),180000);
  try{
    const r=await fetch(`http://127.0.0.1:${WORKER_BACKEND_PORT}${pathname}`,{method,headers:{'content-type':'application/json'},signal:controller.signal});
    const text=await r.text();
    let data;try{data=JSON.parse(text)}catch(_){data={ok:r.ok,text}}
    if(!r.ok) throw new Error(data?.error||`Worker backend HTTP ${r.status}`);
    workerBackendAlive=true;workerBackendLastError=null;return data;
  }finally{clearTimeout(timer)}
}

function mergeByKey(primary=[],secondary=[],keyFn){const out=[],seen=new Set();for(const item of [...primary,...secondary]){if(!item)continue;const k=keyFn(item);if(!k||seen.has(k))continue;seen.add(k);out.push(item)}return out}
async function syncWorkerState(){
  try{
    const child=await proxyWorker('/api/state','GET');
    let state=await getState();
    if(Array.isArray(child.agents)){const byId=new Map(child.agents.map(a=>[String(a.id||'').toLowerCase(),a]));state.agents=(state.agents||[]).map(a=>byId.has(String(a.id||'').toLowerCase())?{...a,...byId.get(String(a.id||'').toLowerCase())}:a)}
    if(child.workerEngine)state.workerEngine=child.workerEngine;
    if(Array.isArray(child.platforms)){
      const byId=new Map(child.platforms.map(x=>[String(x.id||'').toLowerCase(),x]));
      state.platforms=(state.platforms||[]).map(p=>{
        const c=byId.get(String(p.id||'').toLowerCase());
        if(!c)return p;
        const merged={...p,...c,metricLabel:p.metricLabel,metricTarget:p.metricTarget,note:p.note};
        const mainTs=Date.parse(p.publicCountUpdatedAt||0)||0;
        const childTs=Date.parse(c.publicCountUpdatedAt||0)||0;
        // The legacy worker backend still carries old seed counts. Never let it overwrite a newer public-count tracker result.
        if(mainTs>=childTs){
          merged.followers=p.followers;
          merged.publicCountUpdatedAt=p.publicCountUpdatedAt;
          merged.publicCountLastAttemptAt=p.publicCountLastAttemptAt;
          merged.publicCountStatus=p.publicCountStatus;
          merged.publicCountSource=p.publicCountSource;
          merged.publicCountError=p.publicCountError;
          merged.lastCountChangeAt=p.lastCountChangeAt;
          if(String(p.id).toLowerCase()==='instagram') merged.metricValue=p.metricValue;
        }
        return merged;
      })
    }
    if(Array.isArray(child.opportunities)){const incoming=child.opportunities.filter(o=>o&&o.id!=='seed-1');state.opportunities=mergeByKey(incoming,state.opportunities||[],o=>o.sourceUrl||o.applicationUrl||o.website||o.id).slice(0,40)}
    if(Array.isArray(child.analytics))state.analytics=child.analytics.slice(0,200);
    if(Array.isArray(child.verdicts))state.verdicts=child.verdicts.slice(0,100);
    if(Array.isArray(child.activity)){const incoming=child.activity.slice(0,30);state.activity=mergeByKey(incoming,state.activity||[],x=>`${x.agent||''}|${x.text||''}|${x.time||''}`).slice(0,100)}
    state.meta=state.meta||{};state.meta.workerBackend={alive:true,lastSyncAt:new Date().toISOString(),lastError:null};
    workerBackendAlive=true;workerBackendLastSync=new Date().toISOString();workerBackendLastError=null;
    await saveState(state);
  }catch(err){workerBackendAlive=false;workerBackendLastError=String(err.message||err);try{const state=await getState();state.meta=state.meta||{};state.meta.workerBackend={alive:false,lastSyncAt:workerBackendLastSync,lastError:workerBackendLastError};await saveState(state)}catch(_){}}
}
function startWorkerSync(){if(workerSyncTimer)clearInterval(workerSyncTimer);setTimeout(()=>syncWorkerState(),5000).unref();workerSyncTimer=setInterval(()=>syncWorkerState(),5000);workerSyncTimer.unref()}


const DEFAULT_OPPORTUNITIES = [
  {
    id:'boxncase-free-review', brand:'BoxNCase', category:'free_product', type:'FREE PRODUCT + AFFILIATE', fit:96,
    shortDescription:'Specialty food and beverage samples built for honest unboxings and reviews.',
    website:'https://www.boxncase.com/', productUrl:'https://www.boxncase.com/', contactUrl:'https://creator.boxncase.com/', contactMethod:'Apply through the official BoxNCase Creator program.',
    compensation:'Complimentary product samples + creator commissions; monthly payouts are advertised by the program.',
    partnership:'DTL receives specialty food or beverage products, records an honest taste-test/unboxing/review, then can use trackable creator links if the product is a real fit.',
    fitReason:'DTL already produces food and product-reaction content, so the product can become natural entertainment instead of a forced ad.',
    sourceUrl:'https://creator.boxncase.com/', sourceFreshness:'Verified Sep 15, 2026', status:'HIGH PRIORITY',
    emailTemplate:`Subject: Down The Line x BoxNCase — Product Review Collaboration\n\nHi BoxNCase Creator Team,\n\nI’m reaching out from Down The Line Podcast. We create entertainment-driven food and product reaction content across TikTok, Instagram, and YouTube, and BoxNCase looks like a strong fit for an honest unboxing/taste-test segment.\n\nWe’d love to explore receiving a product selection for consideration in an honest review. If you also have paid creator opportunities available, we’d be interested in discussing those first; otherwise we’re open to the creator/affiliate structure listed in your program.\n\nWe never promise a positive review or guaranteed coverage, but we do make engaging, personality-driven content and would clearly disclose any gifted or commercial relationship.\n\nHappy to send our current verified DTL performance snapshot and relevant food-content examples.\n\nBest,\nDown The Line Podcast`
  },
  {
    id:'kalmes-free-review', brand:'Kalmes Foods', category:'free_product', type:'FREE PRODUCT + AFFILIATE', fit:92,
    shortDescription:'Seasonings and breading mixes with free samples for approved creators.',
    website:'https://kalmesfoods.com/', productUrl:'https://kalmesfoods.com/pages/for-influencers', contactUrl:'https://kalmesfoods.com/pages/for-influencers', contactMethod:'Apply through the Kalmes Foods Creator Program / Shopify Collabs form.',
    compensation:'Free product samples + 15% commission on sales through the creator code/link.',
    partnership:'DTL can build a before-vs-after food test, seasoning challenge, or honest recipe/reaction segment around the samples and optionally use the creator code if viewers want the product.',
    fitReason:'The format is easy to make entertaining and measurable: cook the same food with and without the product, then give a real verdict.',
    sourceUrl:'https://kalmesfoods.com/pages/for-influencers', sourceFreshness:'Verified Sep 15, 2026', status:'READY TO PITCH',
    emailTemplate:`Subject: Creator Collaboration — Down The Line Podcast x Kalmes Foods\n\nHi Kalmes Foods Team,\n\nI’m reaching out from Down The Line Podcast. Our food-review content is built around honest reactions and simple tests that viewers can immediately understand. Your seasoning and breading products would work well for a side-by-side taste test or “does this actually make it better?” segment.\n\nWe’d be interested in joining your creator program and receiving samples for consideration in an honest review. If there is any paid creator budget available for a stronger dedicated integration, we’d also be happy to discuss that.\n\nAny gifted/affiliate relationship would be clearly disclosed, and we do not promise a positive review.\n\nBest,\nDown The Line Podcast`
  },
  {
    id:'bakeful-sponsor', brand:'Bakeful', category:'sponsor', type:'PAID / GIFTED CREATOR COLLAB', fit:94,
    shortDescription:'Snack brand actively offering paid and gifted creator collaborations, UGC, and launch campaigns.',
    website:'https://bakefulbunch.com/', productUrl:'https://bakefulbunch.com/', contactUrl:'https://bakefulbunch.com/', contactMethod:'Use the Bakeful Creator application on the official Bakeful Bunch page.',
    compensation:'Official creator track advertises paid and gifted collaborations, UGC, and launch campaigns. Creator applications are reviewed monthly.',
    partnership:'A paid DTL snack taste-test, launch reaction, ranking challenge, or short-form UGC package using Bakeful products without changing the show into a traditional commercial.',
    fitReason:'Snack testing is already native to DTL’s content style and can produce both a main segment and multiple short clips.',
    sourceUrl:'https://bakefulbunch.com/', sourceFreshness:'Verified Sep 15, 2026', status:'HIGH PRIORITY',
    emailTemplate:`Subject: Paid Creator Collaboration — Down The Line Podcast x Bakeful\n\nHi Bakeful Creator Team,\n\nI’m reaching out from Down The Line Podcast. We create personality-driven food and snack reactions across TikTok, Instagram, and YouTube, and Bakeful’s paid/gifted creator track looks very aligned with the type of content we already make.\n\nWe’d love to discuss a paid creator collaboration built around an honest taste test, ranking challenge, or new-flavor reaction. We can also create short-form cuts from the same recording for additional social use if that matches your campaign needs.\n\nWe keep reviews honest, disclose commercial relationships, and never promise a positive outcome. I can send our current verified DTL food-content performance snapshot and examples.\n\nBest,\nDown The Line Podcast`
  },
  {
    id:'calywire-sponsor', brand:'Calywire Creator Network', category:'sponsor', type:'PAID + GIFTED CAMPAIGNS', fit:88,
    shortDescription:'Paid and gifted creator campaigns for Korean and Japanese brands entering the U.S.',
    website:'https://calywire.com/creators/', productUrl:'https://calywire.com/creators/', contactUrl:'https://calywire.com/creators/', contactMethod:'Apply through the official Calywire Creator Network application.',
    compensation:'Free products to keep + paid partnerships + affiliate commissions; no follower minimum is advertised.',
    partnership:'DTL can match with food, lifestyle, or culture products from Korean/Japanese brands and create review/reaction content under a clearly defined campaign brief.',
    fitReason:'The mix of food reviews, entertainment, anime/manga interest, and reaction content gives DTL multiple ways to match incoming Asian consumer brands.',
    sourceUrl:'https://calywire.com/creators/', sourceFreshness:'Verified Sep 15, 2026', status:'NEW',
    emailTemplate:`Subject: Down The Line Podcast — Creator Network Application\n\nHi Calywire Team,\n\nI’m reaching out from Down The Line Podcast. We cover entertainment, food/product reactions, anime/manga, gaming, sports, and trending culture across TikTok, Instagram, and YouTube.\n\nYour paid and gifted campaigns for Korean and Japanese brands look like a strong fit for our audience and content mix. We’re especially interested in products that can be tested or reacted to naturally on camera.\n\nWe’d love to be considered for relevant paid campaigns first, while remaining open to gifted and affiliate opportunities when the product fit is strong. Any commercial relationship would be clearly disclosed and all reviews remain honest.\n\nBest,\nDown The Line Podcast`
  },
  {
    id:'tokyotreat-affiliate', brand:'TokyoTreat', category:'affiliate', type:'AFFILIATE + PRODUCT BOX', fit:95,
    shortDescription:'Japanese snack subscription box with product box + per-conversion affiliate payouts.',
    website:'https://tokyotreat.com/', productUrl:'https://tokyotreat.com/', contactUrl:'https://tokyotreat.com/affiliate', contactMethod:'Apply through the TokyoTreat affiliate inquiry form.',
    compensation:'Affiliate page currently lists $5 per conversion at Tier 1, a 30-day attribution window, monthly PayPal payouts, and a TokyoTreat box for approved affiliates.',
    partnership:'DTL receives a Japanese snack box, creates a themed taste test/ranking, and uses the unique affiliate link if viewers want to subscribe.',
    fitReason:'Japanese snacks can bridge DTL’s food content with its anime/manga audience, making this more relevant than a generic affiliate placement.',
    sourceUrl:'https://tokyotreat.com/affiliate', sourceFreshness:'Verified Sep 15, 2026', status:'READY TO PITCH',
    emailTemplate:`Subject: TokyoTreat x Down The Line Podcast\n\nHi TokyoTreat Team,\n\nI’m reaching out from Down The Line Podcast. We create food reactions alongside anime/manga and entertainment content, which makes TokyoTreat a natural crossover for our audience.\n\nWe’d love to join the affiliate program and build an honest Japanese snack-box taste test/ranking segment around a TokyoTreat box. We would clearly disclose the affiliate relationship and only recommend the product based on our real experience.\n\nIf there are paid creator campaign opportunities available beyond the standard affiliate program, we’d also be interested in discussing those.\n\nBest,\nDown The Line Podcast`
  },
  {
    id:'ooni-affiliate', brand:'Ooni', category:'affiliate', type:'AFFILIATE / CREATOR', fit:82,
    shortDescription:'Pizza-oven brand with an official creator/affiliate program and product-launch access.',
    website:'https://ooni.com/', productUrl:'https://ooni.com/', contactUrl:'https://ooni.com/pages/become-an-affiliate', contactMethod:'Apply via Ooni’s official Affiliates and Creators page.',
    compensation:'Affiliate commission is offered; the program also advertises early product-launch access, event invites, and promotions. Exact commission rate is not publicly stated on the page.',
    partnership:'A DTL pizza cook-off, frozen-vs-Ooni comparison, or “is this worth it?” episode can support affiliate links without losing the honest-review format.',
    fitReason:'DTL already makes food/review content, though the product is higher-ticket and requires more production than snack-based partnerships.',
    sourceUrl:'https://ooni.com/pages/become-an-affiliate', sourceFreshness:'Verified Sep 15, 2026', status:'NEW',
    emailTemplate:`Subject: Ooni Creator / Affiliate Collaboration — Down The Line Podcast\n\nHi Ooni Team,\n\nI’m reaching out from Down The Line Podcast. We create entertainment-driven food and product review content and would love to explore Ooni’s creator/affiliate program.\n\nA natural fit for us would be an honest pizza challenge, comparison, or “is it worth it?” episode using Ooni, with short-form clips cut from the same segment.\n\nWe’d be interested in any paid creator opportunities first, and are also open to affiliate participation when the product and campaign fit our audience. Any commercial relationship would be clearly disclosed.\n\nBest,\nDown The Line Podcast`
  }
];

const DEFAULT_TRENDS = {
  lastUpdated:'2026-09-15T22:25:00Z',
  hashtagSource:'TikTok Creative Center public U.S. snapshots. Trend tags rotate quickly; use only when the actual post is relevant.',
  keywordSource:'YouTube search-trend snapshot from vidIQ, updated Sep 13, 2026. These are discovery signals, not guaranteed views.',
  hashtags:[
    {term:'#dollyparton',metric:'2.4B views',context:'News & Entertainment · observed in current public Creative Center snapshot'},
    {term:'#haydenpanettiere',metric:'807M views',context:'News & Entertainment · current public Creative Center snapshot'},
    {term:'#september',metric:'172.7M views',context:'News & Entertainment · U.S. 7-day snapshot'},
    {term:'#worththesearch',metric:'122.2M views',context:'Broad trend · current public Creative Center snapshot'},
    {term:'#livecanbeeasy',metric:'37.2M views',context:'News & Entertainment · U.S. 7-day snapshot'}
  ],
  keywords:[
    {term:'real madrid vs inter milan',metric:'+12,281%',context:'YouTube search growth · sports'},
    {term:'wolverine review',metric:'+7,642%',context:'YouTube search growth · movies / reviews'},
    {term:'champions league highlights',metric:'+6,379%',context:'YouTube search growth · sports'},
    {term:'blizzcon 2026',metric:'+5,981%',context:'YouTube search growth · gaming'},
    {term:'godzilla minus zero trailer',metric:'+4,898%',context:'YouTube search growth · movies / entertainment'}
  ]
};

const DEFAULT_ANALYSIS_30M = {
  window:'Last 30 minutes', updatedAt:null,
  analyzed:'No completed 30-minute worker summary has been pushed yet. The dashboard is ready to receive the next opportunity, trend, performance, and content-analysis cycle.',
  doingWell:'Waiting for current-cycle evidence before calling anything a strength.',
  doingWrong:'Waiting for current-cycle evidence before labeling a weakness.',
  improve:'Once the next cycle finishes, the system will convert the evidence into one or two concrete changes to test next.'
};

const SEED_STATE = {
  meta:{project:'Down The Line',updatedAt:'2026-09-15T22:25:00Z',mode:'seed'},
  platforms:[
    {id:'tiktok',name:'TikTok',handle:'@down.the.line.pod',followers:913,followerTarget:10000,metricLabel:'Eligible views / 30d',metricValue:null,metricTarget:100000,status:'Tracking public count',note:'Creator Rewards private eligible-view data requires authorized analytics.'},
    {id:'instagram',name:'Instagram',handle:'@down.the.line.pod',followers:100,followerTarget:500,metricLabel:'Nearest native unlock',metricValue:100,metricTarget:500,status:'Gifts path',note:'This is one Instagram monetization path, not a universal threshold.'},
    {id:'youtube',name:'YouTube',handle:'@Down.The.Line.Podcast',followers:1540,followerTarget:1000,metricLabel:'Qualified watch hours / 365d',metricValue:null,metricTarget:4000,status:'Subscriber goal cleared',note:'Qualified watch hours remain DATA NOT CONNECTED until an authorized source provides them.'}
  ],
  agents:[
    {id:'hook',name:'HOOK',role:'Hook Specialist',initials:'HK',status:'Watching',current:'Opening strength across recent clips',confidence:82,finding:'Make the premise understandable before the viewer has time to scroll.'},
    {id:'retention',name:'RETENTION',role:'Retention Specialist',initials:'RT',status:'Analyzing',current:'Pacing and payoff timing',confidence:76,finding:'Move the payoff forward when setup stops adding value.'},
    {id:'content',name:'CONTENT',role:'Content Specialist',initials:'CT',status:'Watching',current:'Topic and standalone clip value',confidence:79,finding:'Prioritize moments that work without needing full-episode context.'},
    {id:'packaging',name:'PACKAGING',role:'Packaging Specialist',initials:'PK',status:'Analyzing',current:'Titles, captions and thumbnails',confidence:81,finding:'Packaging should make one clear promise.'},
    {id:'performance',name:'PERFORMANCE',role:'Performance Specialist',initials:'PF',status:'Tracking',current:'Cross-platform public performance',confidence:88,finding:'Build a verified baseline before declaring a format a winner.'},
    {id:'discovery',name:'DISCOVERY',role:'Discovery & Experiment Specialist',initials:'DS',status:'Testing',current:'Posting windows and format variables',confidence:71,finding:'Change one major variable at a time.'},
    {id:'algorithm',name:'ALGORITHM',role:'Algorithm & Trend Intelligence',initials:'AL',status:'Researching',current:'Platform guidance and current trends',confidence:77,finding:'Treat trends as time-sensitive opportunities.'},
    {id:'competitive',name:'COMPETITIVE',role:'Competitive Pattern Specialist',initials:'CP',status:'Researching',current:'Winning patterns in DTL categories',confidence:74,finding:'Adapt repeatable structures without copying creators.'},
    {id:'goal',name:'GOAL',role:'Goal & Monetization Specialist',initials:'GL',status:'Tracking',current:'Monetization bottlenecks',confidence:90,finding:'Qualified watch-hour data is still the missing YouTube metric.'},
    {id:'opportunity',name:'OPPORTUNITY',role:'Revenue Opportunity Scout',initials:'OP',status:'Scouting',current:'Sponsors, affiliates and product seeding',confidence:75,finding:'Use verified category-specific DTL analytics in pitches.'}
  ],
  opportunities:DEFAULT_OPPORTUNITIES,
  trends:DEFAULT_TRENDS,
  analysis30m:DEFAULT_ANALYSIS_30M,
  activity:[{time:'Now',agent:'OPPORTUNITY',text:'Opportunity dashboard initialized.'},{time:'Now',agent:'ALGORITHM',text:'Trend board initialized.'}],
  meeting:{title:'Strategy Meeting',status:'Ready for evidence',decision:{stop:'Using unverified numbers in external pitches',start:'Building category-specific evidence packages',keep:'Honest review positioning',test:'Which DTL categories create the strongest sponsor response',immediate:'Collect verified analytics and rank outreach opportunities'}},
  gamePlan:{headline:'Build evidence, then turn it into reach and revenue.',postNow:[{platform:'TikTok',action:'Lead with a clear first-second premise and only use trend tags that actually match the post.'},{platform:'Instagram',action:'Package Reels for discovery while tracking native monetization separately.'},{platform:'YouTube',action:'Prioritize long-form retention and qualified watch-hour growth.'}]},
  verdicts:[],analytics:[]
};

let memoryState=JSON.parse(JSON.stringify(SEED_STATE));let pool=null;let dbReady=false;let server=null;
app.disable('x-powered-by');app.use(express.json({limit:'2mb'}));

function inferCategory(o={}){const explicit=String(o.category||'').toLowerCase();if(['free_product','sponsor','affiliate'].includes(explicit))return explicit;const s=`${o.type||''} ${o.compensation||''} ${o.shortDescription||''}`.toLowerCase();if(/sponsor|paid|paid campaign|paid partnership/.test(s))return 'sponsor';if(/free product|gifted|complimentary|sample|product box|product seeding|product testing/.test(s))return 'free_product';if(/affiliate|commission/.test(s))return 'affiliate';return 'free_product'}
function genericEmail(o){return `Subject: Down The Line Podcast x ${o.brand||'Brand'}\n\nHi ${o.brand||'Brand'} Team,\n\nI’m reaching out from Down The Line Podcast. We create entertainment-driven content across TikTok, Instagram, and YouTube and would love to explore a collaboration that fits naturally with our audience.\n\nWe’d like to discuss a paid opportunity first when budget is available, while remaining open to affiliate or gifted-product options when the fit is strong. Any relationship would be clearly disclosed, and we never promise a positive review or guaranteed coverage.\n\nBest,\nDown The Line Podcast`}
function normalizeOpportunity(o){return {...o,category:o.category||inferCategory(o),shortDescription:o.shortDescription||o.why||'Open creator opportunity',website:o.website||((o.source||'').startsWith('http')?o.source:null),productUrl:o.productUrl||o.website||null,contactUrl:o.contactUrl||o.website||null,contactMethod:o.contactMethod||o.contact||'Use the official application/contact route.',partnership:o.partnership||o.why||'Potential creator partnership.',fitReason:o.fitReason||o.why||'Fit should be re-evaluated against current DTL content.',emailTemplate:o.emailTemplate||genericEmail(o)}}
function normalizeState(state){state=state||{};state.meta=state.meta||{};state.platforms=Array.isArray(state.platforms)?state.platforms:SEED_STATE.platforms;state.agents=(Array.isArray(state.agents)?state.agents:SEED_STATE.agents).map(a=>({...a,workState:a.workState||'idle'}));let opps=Array.isArray(state.opportunities)?state.opportunities.filter(o=>o.id!=='seed-1'):[];if(!opps.length)opps=DEFAULT_OPPORTUNITIES;state.opportunities=opps.map(normalizeOpportunity);if(!state.trends||!Array.isArray(state.trends.hashtags)||!state.trends.hashtags.length)state.trends=JSON.parse(JSON.stringify(DEFAULT_TRENDS));state.trends.refreshStatus=state.trends.refreshStatus||'waiting';if(!state.analysis30m)state.analysis30m=JSON.parse(JSON.stringify(DEFAULT_ANALYSIS_30M));state.activity=Array.isArray(state.activity)?state.activity:[];state.meeting=state.meeting||SEED_STATE.meeting;state.gamePlan=state.gamePlan||SEED_STATE.gamePlan;return state}


const TREND_REFRESH_MS=Math.max(3,Number(process.env.TREND_REFRESH_MINUTES||5))*60*1000;
const ANALYSIS_REFRESH_MS=30*60*1000;
const PLATFORM_REFRESH_MS=Math.max(5,Number(process.env.PLATFORM_REFRESH_MINUTES||10))*60*1000;
let trendTimer=null,analysisTimer=null,platformTimer=null,trendRunning=false,analysisRunning=false,platformRunning=false;
function cleanText(s=''){return String(s).replace(/<!\[CDATA\[|\]\]>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim()}
function stripTags(s=''){return cleanText(String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '))}
function humanCount(n){n=Number(n)||0;if(n>=1e9)return (n/1e9).toFixed(n>=1e10?0:1)+'B';if(n>=1e6)return (n/1e6).toFixed(n>=1e7?0:1)+'M';if(n>=1e3)return (n/1e3).toFixed(n>=1e4?0:1)+'K';return String(n)}
async function fetchText(url,timeoutMs=12000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; DTLWarRoom/1.0)','accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'},redirect:'follow',signal:c.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}}
function parseHumanCount(value){
  const raw=String(value||'').replace(/&nbsp;/gi,' ').trim().replace(/,/g,'');
  const m=raw.match(/([0-9]+(?:\.[0-9]+)?)\s*([KMB])?/i);
  if(!m)return null;
  const n=Number(m[1]); if(!Number.isFinite(n))return null;
  const mult=({K:1e3,M:1e6,B:1e9})[(m[2]||'').toUpperCase()]||1;
  return Math.round(n*mult);
}
function firstCount(html,patterns){
  for(const pat of patterns){
    const m=String(html||'').match(pat);
    if(!m)continue;
    const n=parseHumanCount(m[1]);
    if(Number.isFinite(n)&&n>=0)return n;
  }
  return null;
}
async function fetchProfileText(url,timeoutMs=16000){
  const c=new AbortController();const t=setTimeout(()=>c.abort(),timeoutMs);
  try{
    const r=await fetch(url,{redirect:'follow',signal:c.signal,headers:{
      'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language':'en-US,en;q=0.9','cache-control':'no-cache','pragma':'no-cache'
    }});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.text();
  }finally{clearTimeout(t)}
}
async function scrapeCountFromSources(sources,patterns){
  const errors=[];
  for(const source of sources){
    try{
      const html=await fetchProfileText(source.url);
      const count=firstCount(html,patterns);
      if(Number.isFinite(count))return {count,source:source.name,url:source.url};
      errors.push(source.name+': count not found');
    }catch(e){errors.push(source.name+': '+String(e.message||e))}
  }
  throw new Error(errors.join(' | ').slice(0,900));
}
async function fetchYouTubePublicCount(){
  return scrapeCountFromSources([
    {name:'YouTube profile',url:'https://www.youtube.com/@Down.The.Line.Podcast?hl=en'},
    {name:'YouTube about',url:'https://www.youtube.com/@Down.The.Line.Podcast/about?hl=en'},
    {name:'Jina YouTube fallback',url:'https://r.jina.ai/http://www.youtube.com/@Down.The.Line.Podcast/about'}
  ],[
    /\"subscriberCountText\"\s*:\s*\{\s*\"simpleText\"\s*:\s*\"([^\"]+)/i,
    /\"subscriberCountText\"\s*:\s*\{[\s\S]{0,180}?\"text\"\s*:\s*\"([^\"]+)/i,
    /([0-9][0-9.,]*\s*[KMB]?)\s+subscribers?/i,
    /Subscribers?[^0-9]{0,30}([0-9][0-9.,]*\s*[KMB]?)/i
  ]);
}
async function fetchTikTokPublicCount(){
  return scrapeCountFromSources([
    {name:'TikTok profile',url:'https://www.tiktok.com/@down.the.line.pod'},
    {name:'Jina TikTok fallback',url:'https://r.jina.ai/http://www.tiktok.com/@down.the.line.pod'}
  ],[
    /\"followerCount\"\s*:\s*([0-9]+)/i,
    /\"follower_count\"\s*:\s*([0-9]+)/i,
    /\"fans\"\s*:\s*([0-9]+)/i,
    /([0-9][0-9.,]*\s*[KMB]?)\s+Followers?/i
  ]);
}
async function fetchInstagramPublicCount(){
  return scrapeCountFromSources([
    {name:'Instagram profile',url:'https://www.instagram.com/down.the.line.pod/'},
    {name:'Jina Instagram fallback',url:'https://r.jina.ai/http://www.instagram.com/down.the.line.pod/'}
  ],[
    /\"edge_followed_by\"\s*:\s*\{\s*\"count\"\s*:\s*([0-9]+)/i,
    /\"follower_count\"\s*:\s*([0-9]+)/i,
    /content=\"([0-9][0-9.,]*\s*[KMB]?)\s+Followers/i,
    /([0-9][0-9.,]*\s*[KMB]?)\s+Followers/i
  ]);
}
async function refreshPlatformCounts(){
  if(platformRunning)return;
  platformRunning=true;
  let state=await getState();
  const started=new Date();
  const previous=new Map((state.platforms||[]).map(p=>[String(p.id).toLowerCase(),{count:Number(p.followers||0),status:p.publicCountStatus||null}]));
  state.platformTracker={...(state.platformTracker||{}),status:'refreshing',lastAttemptAt:started.toISOString(),nextRefreshAt:new Date(started.getTime()+PLATFORM_REFRESH_MS).toISOString(),lastError:null};
  for(const p of state.platforms||[])p.publicCountLastAttemptAt=started.toISOString();
  await saveState(state);
  const tasks=[
    ['youtube',fetchYouTubePublicCount],
    ['tiktok',fetchTikTokPublicCount],
    ['instagram',fetchInstagramPublicCount]
  ];
  const results=await Promise.all(tasks.map(async([id,fn])=>{try{return {id,ok:true,...await fn()}}catch(e){return {id,ok:false,error:String(e.message||e)}}}));
  state=await getState();
  const now=new Date().toISOString();
  const changed=[];const failures=[];let successCount=0;
  for(const result of results){
    const p=(state.platforms||[]).find(x=>String(x.id).toLowerCase()===result.id);
    if(!p)continue;
    p.publicCountLastAttemptAt=now;
    if(result.ok&&Number.isFinite(result.count)){
      successCount++;
      const old=Number(p.followers||0);
      p.followers=result.count;
      p.publicCountUpdatedAt=now;
      p.publicCountStatus='ok';
      p.publicCountSource=result.source;
      p.publicCountError=null;
      if(result.id==='instagram')p.metricValue=result.count;
      if(result.id==='youtube')p.status=result.count>=Number(p.followerTarget||1000)?'Subscriber goal cleared':'Tracking public count';
      else p.status='Tracking public count';
      if(old!==result.count){p.lastCountChangeAt=now;changed.push(`${p.name}: ${old.toLocaleString()} → ${result.count.toLocaleString()}`)}
    }else{
      p.publicCountStatus='error';
      p.publicCountError=result.error||'Public profile source blocked the refresh';
      failures.push(`${p.name}: ${p.publicCountError}`);
    }
  }
  state.platformTracker={...(state.platformTracker||{}),status:successCount===results.length?'ok':successCount?'partial':'error',lastAttemptAt:now,lastSuccessAt:successCount?now:(state.platformTracker?.lastSuccessAt||null),nextRefreshAt:new Date(Date.now()+PLATFORM_REFRESH_MS).toISOString(),lastError:failures.length?failures.join(' | ').slice(0,1200):null};
  if(changed.length)state.activity=[{time:'Now',agent:'GOAL',text:'Public platform counts updated — '+changed.join(' · ')},...(state.activity||[])].slice(0,100);
  else if(successCount)state.activity=[{time:'Now',agent:'GOAL',text:`Public follower/subscriber check completed (${successCount}/3 sources verified; no count change).`},...(state.activity||[])].slice(0,100);
  await saveState(state);
  platformRunning=false;
}

function parseTikTokHashtags(html){const out=[],seen=new Set();const jsonRe=/\"hashtagName\"\s*:\s*\"([^\"]+)\"/g;let m;while((m=jsonRe.exec(html))&&out.length<12){const term=cleanText(m[1]);if(!term||seen.has(term.toLowerCase()))continue;const near=html.slice(m.index,m.index+900);const vm=near.match(/\"(?:videoViews|viewCnt|views)\"\s*:\s*\"?(\d+)/i);const pm=near.match(/\"(?:publishCnt|postCount|posts)\"\s*:\s*\"?(\d+)/i);out.push({term:'#'+term.replace(/^#/,''),metric:vm?humanCount(vm[1])+' views':pm?humanCount(pm[1])+' posts':'Trending',context:'TikTok Creative Center · U.S. 7-day trend'});seen.add(term.toLowerCase())}
if(out.length<5){const text=stripTags(html);const rowRe=/#\s*([A-Za-z0-9_]+)[\s\S]{0,120}?([0-9]+(?:\.[0-9]+)?\s*[KMB]?)\s*Posts[\s\S]{0,80}?([0-9]+(?:\.[0-9]+)?\s*[KMB]?)\s*Views/gi;while((m=rowRe.exec(text))&&out.length<12){const term=m[1];if(seen.has(term.toLowerCase()))continue;out.push({term:'#'+term,metric:m[3].replace(/\s+/g,'')+' views',context:'TikTok Creative Center · U.S. 7-day trend'});seen.add(term.toLowerCase())}const re=/#\s*([A-Za-z0-9_]+)\s*([0-9]+(?:\.[0-9]+)?\s*[KMB]?)\s*Posts/gi;while((m=re.exec(text))&&out.length<12){const term=m[1];if(seen.has(term.toLowerCase()))continue;out.push({term:'#'+term,metric:m[2].replace(/\s+/g,'')+' posts',context:'TikTok Creative Center · U.S. 7-day trend'});seen.add(term.toLowerCase())}}
return out.slice(0,5)}
function parseGoogleTrendsRss(xml){const items=xml.match(/<item>[\s\S]*?<\/item>/g)||[];const out=[];for(const item of items){const tm=item.match(/<title>([\s\S]*?)<\/title>/i);if(!tm)continue;const traffic=item.match(/<(?:ht:)?approx_traffic>([\s\S]*?)<\/(?:ht:)?approx_traffic>/i);const term=cleanText(tm[1]);if(!term)continue;out.push({term,metric:traffic?cleanText(traffic[1])+' searches':'Trending now',context:'Google Trends · U.S. current search momentum'});if(out.length>=5)break}return out}
function setAgentWork(state,id,workState,current){const i=(state.agents||[]).findIndex(a=>a.id===id);if(i<0)return;const now=new Date().toISOString();state.agents[i]={...state.agents[i],workState,current:current||state.agents[i].current,currentlyDoing:current||state.agents[i].currentlyDoing,workStartedAt:now,workHeartbeatAt:now}}
function finishAgentWork(state,id,summary){const i=(state.agents||[]).findIndex(a=>a.id===id);if(i<0)return;const now=new Date().toISOString();state.agents[i]={...state.agents[i],workState:'idle',lastCompletedAt:now,workHeartbeatAt:now,lastTaskSummary:summary||state.agents[i].lastTaskSummary}}
function hashtagify(term){return '#'+String(term||'').toLowerCase().replace(/&amp;/g,' and ').replace(/[^a-z0-9]+/g,'').slice(0,46)}
function deriveHashtagsFromKeywords(items=[]){const out=[];const seen=new Set();for(const item of items){const term=hashtagify(item.term||item.keyword);if(term.length<3||seen.has(term))continue;seen.add(term);out.push({term,metric:item.metric||'Trending now',context:'Live Google Trends fallback · cross-platform topic momentum'});if(out.length>=5)break}return out}
async function refreshTrendData(){
  if(trendRunning)return;
  trendRunning=true;
  let state=await getState();
  const attempt=new Date();
  const cycleId=`trend-${attempt.getTime()}`;
  state.trends={...(state.trends||{}),lastAttempt:attempt.toISOString(),nextRefreshAt:new Date(attempt.getTime()+TREND_REFRESH_MS).toISOString(),refreshStatus:'refreshing',cycleId};
  setAgentWork(state,'algorithm','analysis','Refreshing live hashtag and search-trend sources');
  setAgentWork(state,'discovery','analysis','Comparing current trend momentum for DTL topics');
  await saveState(state);

  let hash=null,keys=null,hashErr=null,keyErr=null,hashSource=null;
  const tiktokUrls=[
    'https://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?countryCode=US&period=7',
    'https://r.jina.ai/http://ads.tiktok.com/business/creativecenter/inspiration/popular/hashtag/pc/en?countryCode=US&period=7'
  ];
  for(const url of tiktokUrls){
    try{
      const html=await fetchText(url);
      const parsed=parseTikTokHashtags(html);
      if(parsed.length>=3){hash=parsed;hashSource=url.includes('r.jina.ai')?'TikTok Creative Center via public text mirror':'TikTok Creative Center direct';break}
      throw new Error('too few parseable hashtag rows');
    }catch(e){hashErr=(hashErr?hashErr+' | ':'')+String(e.message||e)}
  }
  try{
    const xml=await fetchText('https://trends.google.com/trending/rss?geo=US');
    keys=parseGoogleTrendsRss(xml);
    if(keys.length<3)throw new Error('Google Trends returned too few parseable items');
  }catch(e){keyErr=e.message}

  // If TikTok blocks Railway, do not freeze the left column forever.
  // Use the live Google Trends terms as clearly-labelled hashtag candidates until TikTok is reachable again.
  if((!hash||hash.length<3) && keys&&keys.length){
    hash=deriveHashtagsFromKeywords(keys);
    hashSource='Google Trends live fallback';
  }

  state=await getState();
  const now=new Date().toISOString();
  const gotHash=Boolean(hash&&hash.length);
  const gotKeys=Boolean(keys&&keys.length);
  state.trends={...(state.trends||{}),lastAttempt:now,nextRefreshAt:new Date(Date.now()+TREND_REFRESH_MS).toISOString(),refreshStatus:(gotHash||gotKeys)?'ok':'error',cycleId,lastCycleCompletedAt:now};
  if(gotHash){
    state.trends.hashtags=hash;
    state.trends.hashtagUpdatedAt=now;
    state.trends.hashtagSource=hashSource==='Google Trends live fallback'
      ? 'TikTok Creative Center is currently blocking Railway. Hashtags are being rebuilt every cycle from live Google Trends topics so this panel stays fresh; metrics shown are search momentum, not TikTok view counts.'
      : `${hashSource} · U.S. 7-day trends · auto-refreshed by the War Room.`;
    state.trends.hashtagMode=hashSource==='Google Trends live fallback'?'fallback':'tiktok-live';
  }else{
    state.trends.hashtagSource='Hashtag refresh failed ('+(hashErr||'unknown error')+'). Keeping the last verified hashtag snapshot while the next automatic retry is scheduled.';
    state.trends.hashtagMode='stale';
  }
  if(gotKeys){
    state.trends.keywords=keys;
    state.trends.keywordUpdatedAt=now;
    state.trends.keywordSource='Google Trends U.S. trending searches · auto-refreshed by the War Room.';
  }else{
    state.trends.keywordSource='Google Trends refresh failed ('+(keyErr||'unknown error')+'). Keeping the last verified keyword snapshot.';
  }
  if(gotHash||gotKeys)state.trends.lastUpdated=now;
  finishAgentWork(state,'algorithm','Trend refresh completed');
  finishAgentWork(state,'discovery','Trend comparison completed');
  state.activity=[{time:'Now',agent:'ALGORITHM',text:`Trend cycle ${cycleId} completed — hashtags ${gotHash?'updated':'stale'}, keywords ${gotKeys?'updated':'stale'}.`},...(state.activity||[])].slice(0,100);
  await saveState(state);
  trendRunning=false;
}
async function refreshAnalysisSummary(){if(analysisRunning)return;analysisRunning=true;let state=await getState();setAgentWork(state,'performance','analysis','Building the rolling 30-minute performance summary');setAgentWork(state,'goal','analysis','Re-checking monetization progress and bottlenecks');setAgentWork(state,'opportunity','analysis','Re-ranking current revenue opportunities');await saveState(state);state=await getState();const opps=(state.opportunities||[]).filter(o=>o.id!=='seed-1');const yt=(state.platforms||[]).find(p=>p.id==='youtube');const freshVideo=(state.agents||[]).some(a=>a.videoTitle&&Date.now()-new Date(a.taskUpdatedAt||0).getTime()<30*60*1000);const trendAge=Date.now()-new Date(state.trends?.lastUpdated||0).getTime();const doingWell=[];if(yt&&yt.followers>=yt.followerTarget)doingWell.push('YouTube has cleared the displayed subscriber target.');if(opps.length)doingWell.push(opps.length+' verified opportunity leads are stored in the pipeline.');const doingWrong=[];if(!freshVideo)doingWrong.push('No fresh video-analysis heartbeat was received in the last 30 minutes, so the War Room is not pretending a video is being watched.');if(!state.trends?.lastUpdated||trendAge>20*60*1000)doingWrong.push('Trend data is stale or the public trend source is blocking the refresh.');const improve=[];if(!freshVideo)improve.push('Push a real video assignment into /api/agents/:id so HOOK, RETENTION and CONTENT can show genuine green/blue activity.');if(state.trends?.refreshStatus==='error')improve.push('Keep the last verified trend snapshot visible while the automatic refresher retries every 10 minutes.');state.analysis30m={window:'Last 30 minutes',updatedAt:new Date().toISOString(),analyzed:'Reviewed live trend-source freshness, monetization progress, the opportunity pipeline, and real worker heartbeat timestamps.',doingWell:doingWell.join(' ')||'No new strength was verified from the available data in this cycle.',doingWrong:doingWrong.join(' ')||'No major system issue was detected in this cycle.',improve:improve.join(' ')||'Keep collecting real worker heartbeats and verified public performance data before changing the strategy.'};finishAgentWork(state,'performance','30-minute performance summary completed');finishAgentWork(state,'goal','Monetization review completed');finishAgentWork(state,'opportunity','Opportunity ranking review completed');state.activity=[{time:'Now',agent:'PERFORMANCE',text:'Rolling 30-minute system analysis completed.'},...(state.activity||[])].slice(0,100);await saveState(state);analysisRunning=false}
function startSchedulers(){if(trendTimer||analysisTimer||platformTimer)return;setTimeout(()=>refreshTrendData().catch(e=>{trendRunning=false;console.error('trend refresh failed',e)}),3500);setTimeout(()=>refreshPlatformCounts().catch(e=>{platformRunning=false;console.error('platform count refresh failed',e)}),6000);setTimeout(()=>refreshAnalysisSummary().catch(e=>{analysisRunning=false;console.error('analysis refresh failed',e)}),9000);trendTimer=setInterval(()=>refreshTrendData().catch(e=>{trendRunning=false;console.error('trend refresh failed',e)}),TREND_REFRESH_MS);platformTimer=setInterval(()=>refreshPlatformCounts().catch(e=>{platformRunning=false;console.error('platform count refresh failed',e)}),PLATFORM_REFRESH_MS);analysisTimer=setInterval(()=>refreshAnalysisSummary().catch(e=>{analysisRunning=false;console.error('analysis refresh failed',e)}),ANALYSIS_REFRESH_MS)}
async function tryInitDb(){if(!process.env.DATABASE_URL){console.log('DATABASE_URL not set; using in-memory state');return}try{pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false},connectionTimeoutMillis:5000});await pool.query('SELECT 1');await pool.query(`CREATE TABLE IF NOT EXISTS war_room_state (id INTEGER PRIMARY KEY,payload JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);const {rows}=await pool.query('SELECT payload FROM war_room_state WHERE id=1');if(!rows.length){await pool.query('INSERT INTO war_room_state (id,payload) VALUES (1,$1)',[normalizeState(memoryState)]);}else{const normalized=normalizeState(rows[0].payload);memoryState=normalized;await pool.query('UPDATE war_room_state SET payload=$1,updated_at=NOW() WHERE id=1',[normalized]);}dbReady=true;console.log('PostgreSQL connected')}catch(err){dbReady=false;console.error('PostgreSQL unavailable; continuing with in-memory state:',err.message)}}
async function getState(){if(dbReady&&pool){try{const {rows}=await pool.query('SELECT payload FROM war_room_state WHERE id=1');if(rows[0]?.payload){memoryState=normalizeState(rows[0].payload);return memoryState}}catch(err){console.error('Database read failed; using memory state:',err.message)}}memoryState=normalizeState(memoryState);return memoryState}
async function saveState(state){state=normalizeState(state);state.meta.updatedAt=new Date().toISOString();state.meta.mode=dbReady?'postgres':'memory';memoryState=state;if(dbReady&&pool)await pool.query('UPDATE war_room_state SET payload=$1,updated_at=NOW() WHERE id=1',[state]);return state}
function authorized(req){const token=process.env.INGEST_TOKEN;if(!token)return true;return req.headers.authorization===`Bearer ${token}`}
function sendStatic(res,fileName,type,maxAge='public, max-age=86400'){const filePath=path.join(__dirname,fileName);if(!fs.existsSync(filePath))return res.status(404).end();res.set('Cache-Control',maxAge);return res.type(type).sendFile(filePath)}
app.get('/logo.png',(_req,res)=>sendStatic(res,'logo.png','png','no-store'));
app.get('/title-logo-v3.png',(_req,res)=>sendStatic(res,'title-logo-v3.png','png','no-store'));
app.get('/title-logo-v4.png',(_req,res)=>sendStatic(res,'title-logo-v4.png','png','no-store'));
app.get('/health',(_req,res)=>res.status(200).json({ok:true,service:'dtl-war-room',database:dbReady?'connected':'memory-fallback',frontend:'live-status-trends-v4-trackers-fixed',workerBackendAlive,workerBackendLastSync,workerBackendLastError,workerBackendFile:fs.existsSync(path.join(__dirname,'worker-backend.js')),trendRefreshMinutes:Math.round(TREND_REFRESH_MS/60000),platformRefreshMinutes:Math.round(PLATFORM_REFRESH_MS/60000),analysisRefreshMinutes:30,time:new Date().toISOString()}));
app.get('/api/state',async(_req,res)=>{try{res.set('Cache-Control','no-store');res.json(await getState())}catch(err){res.status(500).json({error:'Unable to load War Room state',detail:err.message})}});
app.post('/api/ingest',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();const event=req.body||{};for(const key of ['platforms','agents','meeting','gamePlan','opportunities','verdicts','analytics','trends','analysis30m'])if(event[key]!==undefined)state[key]=event[key];if(event.activity)state.activity=[...event.activity,...(state.activity||[])].slice(0,100);res.json({ok:true,state:await saveState(state)})}catch(err){res.status(500).json({error:err.message})}});
app.post('/api/trends',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();state.trends={...(state.trends||{}),...(req.body||{}),lastUpdated:req.body?.lastUpdated||new Date().toISOString()};await saveState(state);res.json({ok:true,trends:state.trends})}catch(err){res.status(500).json({error:err.message})}});
app.post('/api/analysis30m',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();state.analysis30m={...(state.analysis30m||{}),...(req.body||{}),updatedAt:req.body?.updatedAt||new Date().toISOString()};await saveState(state);res.json({ok:true,analysis30m:state.analysis30m})}catch(err){res.status(500).json({error:err.message})}});
app.post('/api/agents/:id',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();const id=String(req.params.id||'').toLowerCase();const index=(state.agents||[]).findIndex(a=>String(a.id).toLowerCase()===id);if(index<0)return res.status(404).json({error:'Agent not found'});const patch=req.body||{};const raw=String(patch.workState||patch.status||'').toLowerCase();let inferred=patch.workState;if(!inferred){if(raw.includes('watch'))inferred='watching';else if(/analy|research|track|scout|test|creat|work/.test(raw))inferred='analysis';else inferred='idle'}const now=new Date().toISOString();const updated={...state.agents[index],...patch,workState:inferred,id:state.agents[index].id,taskUpdatedAt:now,workHeartbeatAt:now};state.agents[index]=updated;state.activity=[{time:'Now',agent:updated.name,text:`Current task updated: ${updated.targetTitle||updated.videoTitle||updated.current||'assignment changed'}`},...(state.activity||[])].slice(0,100);await saveState(state);res.json({ok:true,agent:updated})}catch(err){res.status(500).json({error:err.message})}});
app.post('/api/worker-heartbeat/:id',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();const id=String(req.params.id||'').toLowerCase();const index=(state.agents||[]).findIndex(a=>String(a.id).toLowerCase()===id);if(index<0)return res.status(404).json({error:'Agent not found'});const now=new Date().toISOString();state.agents[index]={...state.agents[index],...(req.body||{}),id:state.agents[index].id,workHeartbeatAt:now,taskUpdatedAt:now};await saveState(state);res.json({ok:true,agent:state.agents[index]})}catch(err){res.status(500).json({error:err.message})}});

app.post('/api/trends-refresh',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{await refreshTrendData();res.json({ok:true,trends:(await getState()).trends})}catch(err){res.status(500).json({error:err.message})}});
app.post('/api/platform-refresh',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{await refreshPlatformCounts();const s=await getState();res.json({ok:true,platforms:s.platforms,platformTracker:s.platformTracker})}catch(err){platformRunning=false;res.status(500).json({error:err.message})}});
app.post('/api/workers-run',async(req,res)=>{try{res.json(await proxyWorker('/api/workers-run','POST'))}catch(err){res.status(503).json({error:err.message})}});
app.post('/api/opportunity-scan',async(req,res)=>{try{res.json(await proxyWorker('/api/opportunity-scan','POST'))}catch(err){res.status(503).json({error:err.message})}});
app.post('/api/opportunities',async(req,res)=>{if(!authorized(req))return res.status(401).json({error:'Unauthorized'});try{const state=await getState();const body=req.body||{};const item=normalizeOpportunity({...body,id:body.id||`opp-${Date.now()}`,createdAt:new Date().toISOString()});state.opportunities=[item,...(state.opportunities||[]).filter(x=>x.id!==item.id&&x.id!=='seed-1')];state.activity=[{time:'Now',agent:'OPPORTUNITY',text:`New opportunity: ${item.brand||'Unnamed lead'}`},...(state.activity||[])].slice(0,100);await saveState(state);res.json({ok:true,item})}catch(err){res.status(500).json({error:err.message})}});
app.get('/',(_req,res)=>res.status(200).type('html').send(PAGE));app.get('/opportunity/:id',(_req,res)=>res.status(200).type('html').send(PAGE));app.use((req,res,next)=>{if(req.method!=='GET')return next();res.status(200).type('html').send(PAGE)});app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Server error'})});
server=app.listen(PORT,HOST,async()=>{console.log(`DTL War Room listening on http://${HOST}:${PORT}`);await tryInitDb();await startWorkerBackend();startWorkerSync();startSchedulers()});
async function shutdown(signal){shuttingDown=true;console.log(`${signal} received; shutting down cleanly`);try{if(workerSyncTimer)clearInterval(workerSyncTimer);if(platformTimer)clearInterval(platformTimer);if(workerChild&&!workerChild.killed)workerChild.kill('SIGTERM')}catch(_){}if(server)server.close(async()=>{try{if(pool)await pool.end()}catch(_){}process.exit(0)});setTimeout(()=>process.exit(0),5000).unref()}process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
