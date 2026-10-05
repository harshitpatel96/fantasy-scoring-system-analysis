
// Skater page. RAW_SKATERS is filled per season by site.js (loadSkaterSeason).
let RAW_SKATERS = [];

const skA = {
  g: document.getElementById('ska-g'), a: document.getElementById('ska-a'), pm: document.getElementById('ska-pm'),
  pim: document.getElementById('ska-pim'), ppp: document.getElementById('ska-ppp'), shp: document.getElementById('ska-shp'),
  sog: document.getElementById('ska-sog'), hit: document.getElementById('ska-hit'), blk: document.getElementById('ska-blk'),
  fow: document.getElementById('ska-fow')
};
const skB = {
  g: document.getElementById('skb-g'), a: document.getElementById('skb-a'), pm: document.getElementById('skb-pm'),
  pim: document.getElementById('skb-pim'), ppp: document.getElementById('skb-ppp'), shp: document.getElementById('skb-shp'),
  sog: document.getElementById('skb-sog'), hit: document.getElementById('skb-hit'), blk: document.getElementById('skb-blk'),
  fow: document.getElementById('skb-fow')
};
const SK_DEFAULTS_A = {g:6,a:4,pm:2,pim:0,ppp:2,shp:0,sog:0.9,hit:0,blk:1,fow:0};
const SK_DEFAULTS_B = {g:3,a:2,pm:1,pim:0.5,ppp:1,shp:0,sog:0.4,hit:0,blk:0,fow:0};

function skLinkSlider(numberEl, sliderEl){
  const min = parseFloat(sliderEl.min), max = parseFloat(sliderEl.max);
  const clamp = v => Math.min(max, Math.max(min, v));
  sliderEl.addEventListener('input', () => { numberEl.value = sliderEl.value; numberEl.dispatchEvent(new Event('input', {bubbles:true})); });
  numberEl.addEventListener('input', () => { const v = parseFloat(numberEl.value); if (!isNaN(v)) sliderEl.value = clamp(v); });
}
Object.keys(skA).forEach(k => skLinkSlider(skA[k], document.getElementById(`ska-${k==='hit'?'hit':k==='blk'?'blk':k}-s`)));
Object.keys(skB).forEach(k => skLinkSlider(skB[k], document.getElementById(`skb-${k==='hit'?'hit':k==='blk'?'blk':k}-s`)));

function skComputeFP(d, w){
  return d.gl*(parseFloat(w.g.value)||0) + d.as*(parseFloat(w.a.value)||0) + d.pm*(parseFloat(w.pm.value)||0)
       + d.pim*(parseFloat(w.pim.value)||0) + d.ppp*(parseFloat(w.ppp.value)||0) + d.shp*(parseFloat(w.shp.value)||0)
       + d.sog*(parseFloat(w.sog.value)||0) + d.ht*(parseFloat(w.hit.value)||0) + d.bl*(parseFloat(w.blk.value)||0)
       + d.fow*(parseFloat(w.fow.value)||0);
}

function skUpdateFormula(){
  const v = k => document.getElementById(`ska-${k}`).value;
  document.getElementById('sk-formula-a').textContent =
    `FP = ${v('g')}×G + ${v('a')}×A + ${v('pm')}×(+/−) + ${v('pim')}×PIM + ${v('ppp')}×PPP + ${v('shp')}×SHP + ${v('sog')}×SOG + ${v('hit')}×HIT + ${v('blk')}×BLK + ${v('fow')}×FOW`;
}

const skFilterTeam = document.getElementById('sk-filter-team');
const skFilterPos = document.getElementById('sk-filter-pos');
const skFilterName = document.getElementById('sk-filter-name');
const skChartSystemSel = document.getElementById('sk-chart-system');

let skInitialized = false;
let skChartData = [];

function skTeams(){
  return [...new Set(RAW_SKATERS.map(d=>d.t))].sort();
}

function skRecompute(){
  skChartData = RAW_SKATERS.map(d => ({...d, fpA: skComputeFP(d, skA), fpB: skComputeFP(d, skB)}));
  skUpdateFormula();
  skUpdateExamples();
  skRenderMain();
  skRenderCompare();
  skRenderEff();
}

function skGetFiltered(){
  let d = skChartData;
  const t = skFilterTeam.value, p = skFilterPos.value, n = skFilterName.value.trim().toLowerCase();
  if (t) d = d.filter(r => r.t === t);
  if (p) d = d.filter(r => r.p === p);
  if (n) d = d.filter(r => r.n.toLowerCase().includes(n));
  return d;
}

function skMedian(arr){ const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function skMean(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }
function skPercentileRanks(values){ const idx=values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]); const r=new Array(values.length); idx.forEach(([v,i],pos)=>{r[i]=pos/(values.length-1)*100;}); return r; }
function skPearson(a,b){ const n=a.length, ma=skMean(a), mb=skMean(b); let num=0,da=0,db=0; for(let i=0;i<n;i++){const xa=a[i]-ma,xb=b[i]-mb; num+=xa*xb; da+=xa*xa; db+=xb*xb;} return num/Math.sqrt(da*db); }

function skUpdateExamples(){
  const examples = [
    {label:'1G, 1A, +2, 1 PPP, 4 SOG, 2 HIT, 1 BLK, 3 FOW', gl:1,as:1,pm:2,pim:0,ppp:1,shp:0,sog:4,ht:2,bl:1,fow:3},
    {label:'2G, 0A, +1, 2 PIM, 6 SOG, 1 HIT', gl:2,as:0,pm:1,pim:2,ppp:0,shp:0,sog:6,ht:1,bl:0,fow:0},
    {label:'0G, 3A, 0, 2 PPP, 1 SOG', gl:0,as:3,pm:0,pim:0,ppp:2,shp:0,sog:1,ht:0,bl:0,fow:0},
    {label:'0G, 0A, −2, 2 PIM, 2 SOG, 4 HIT, 3 BLK, 8 FOW', gl:0,as:0,pm:-2,pim:2,ppp:0,shp:0,sog:2,ht:4,bl:3,fow:8},
    {label:'0G, 1A, +1, 5 SOG', gl:0,as:1,pm:1,pim:0,ppp:0,shp:0,sog:5,ht:0,bl:0,fow:0}
  ];
  const tbody = document.getElementById('sk-example-table');
  tbody.innerHTML = '';
  examples.forEach(e => {
    const fpA = skComputeFP(e, skA), fpB = skComputeFP(e, skB);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.label}</td><td class="num ${fpA>=0?'fp-pos':'fp-neg'}">${fpA.toFixed(1)}</td><td class="num ${fpB>=0?'fp-pos':'fp-neg'}">${fpB.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });
}

// ---- Canvas scatter helpers (skater datasets are large; canvas keeps this smooth) ----
function skMakeCanvas(wrapId, isMobileHeight, desktopHeight){
  const wrapEl = document.getElementById(wrapId);
  wrapEl.innerHTML = '';
  const isMobile = window.innerWidth < 640;
  const width = Math.max(wrapEl.clientWidth || 900, isMobile ? 340 : 700);
  const height = isMobile ? isMobileHeight : desktopHeight;
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width*dpr; canvas.height = height*dpr;
  canvas.style.width = width+'px'; canvas.style.height = height+'px';
  canvas.style.display = 'block';
  wrapEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return {canvas, ctx, width, height, isMobile};
}
function skCssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

function skAttachHover(canvas, points, buildTooltip){
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left, my = event.clientY - rect.top;
    let best = null, bestDist = 64; // 8px radius squared
    for (let i=0;i<points.length;i++){
      const p = points[i];
      const dx = p.px-mx, dy = p.py-my, dist = dx*dx+dy*dy;
      if (dist < bestDist){ bestDist = dist; best = p.d; }
    }
    if (best){
      tooltip.style.opacity = 1;
      tooltip.style.left = (event.clientX+16)+'px';
      tooltip.style.top = (event.clientY-10)+'px';
      tooltip.innerHTML = buildTooltip(best);
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.style.opacity = 0;
      canvas.style.cursor = 'default';
    }
  });
  canvas.addEventListener('mouseleave', () => { tooltip.style.opacity = 0; });
}

function skRenderMain(){
  const data = skGetFiltered();
  const statsEl = document.getElementById('sk-stats-row');
  if (data.length === 0){ statsEl.innerHTML = '<b>No games match these filters.</b>'; document.getElementById('sk-chart-wrap').innerHTML=''; return; }

  const useB = skChartSystemSel.value === 'b';
  const fpKey = useB ? 'fpB' : 'fpA';
  const sysLabel = useB ? 'System B' : 'System A';
  const sog = data.map(d=>d.sog);
  const fps = data.map(d=>d[fpKey]);
  const xMid = skMedian(sog), yMid = skMedian(fps);

  statsEl.innerHTML = `<span><b>${data.length.toLocaleString()}</b> games shown</span>
    <span>median SOG: <b>${xMid.toFixed(1)}</b></span>
    <span>median FP (${sysLabel}): <b>${yMid.toFixed(1)}</b></span>`;

  const {canvas, ctx, width, height, isMobile} = skMakeCanvas('sk-chart-wrap', 420, 520);
  const margin = {top:20, right:30, bottom:50, left:60};
  const xMax = Math.max(...sog)*1.05 || 1;
  const yMin = Math.min(...fps), yMax = Math.max(...fps);
  const yPad = (yMax-yMin)*0.1 || 1;
  const sx = v => margin.left + (v/xMax)*(width-margin.left-margin.right);
  const sy = v => (height-margin.bottom) - ((v-(yMin-yPad))/((yMax+yPad)-(yMin-yPad)))*(height-margin.bottom-margin.top);

  const ink = skCssVar('--ink'), inkDim = skCssVar('--ink-dim'), line = skCssVar('--line');
  const accent = skCssVar('--accent'), accent2 = skCssVar('--accent2'), q4 = skCssVar('--q4');

  ctx.clearRect(0,0,width,height);
  // quadrant tint
  const xMidPx = sx(xMid), yMidPx = sy(yMid);
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = skCssVar('--q1'); ctx.fillRect(xMidPx, margin.top, width-margin.right-xMidPx, yMidPx-margin.top);
  ctx.fillStyle = skCssVar('--q2'); ctx.fillRect(margin.left, margin.top, xMidPx-margin.left, yMidPx-margin.top);
  ctx.fillStyle = skCssVar('--q3'); ctx.fillRect(margin.left, yMidPx, xMidPx-margin.left, height-margin.bottom-yMidPx);
  ctx.fillStyle = q4; ctx.fillRect(xMidPx, yMidPx, width-margin.right-xMidPx, height-margin.bottom-yMidPx);
  ctx.globalAlpha = 1;

  // median lines
  ctx.strokeStyle = inkDim; ctx.globalAlpha = 0.5; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(xMidPx, margin.top); ctx.lineTo(xMidPx, height-margin.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(margin.left, yMidPx); ctx.lineTo(width-margin.right, yMidPx); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;

  // axes
  ctx.strokeStyle = line; ctx.beginPath();
  ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, height-margin.bottom); ctx.lineTo(width-margin.right, height-margin.bottom); ctx.stroke();
  ctx.fillStyle = inkDim; ctx.font = '11px -apple-system,sans-serif'; ctx.textAlign = 'center';
  for (let i=0;i<=8;i++){ const v = xMax*i/8; ctx.fillText(v.toFixed(0), sx(v), height-margin.bottom+16); }
  ctx.textAlign = 'right';
  for (let i=0;i<=6;i++){ const v = (yMin-yPad) + ((yMax+yPad)-(yMin-yPad))*i/6; ctx.fillText(v.toFixed(0), margin.left-8, sy(v)+4); }
  ctx.textAlign = 'center'; ctx.font = '600 12px -apple-system,sans-serif';
  ctx.fillText('Shots on Goal (workload)', width/2, height-8);
  ctx.save(); ctx.translate(16, height/2); ctx.rotate(-Math.PI/2); ctx.fillText('Fantasy Points', 0, 0); ctx.restore();

  // quadrant labels
  ctx.font = '600 11px -apple-system,sans-serif'; ctx.fillStyle = inkDim;
  ctx.textAlign='right'; ctx.fillText('HIGH SOG / HIGH FP', width-margin.right-8, margin.top+14);
  ctx.textAlign='left'; ctx.fillText('LOW SOG / HIGH FP', margin.left+8, margin.top+14);
  ctx.fillText('LOW SOG / LOW FP', margin.left+8, height-margin.bottom-8);
  ctx.textAlign='right'; ctx.fillText('HIGH SOG / LOW FP', width-margin.right-8, height-margin.bottom-8);

  const points = new Array(data.length);
  for (let i=0;i<data.length;i++){
    const d = data[i];
    const px = sx(d.sog), py = sy(d[fpKey]);
    points[i] = {px, py, d};
    ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI*2);
    ctx.fillStyle = d[fpKey] >= yMid ? accent : q4;
    ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
  }

  skAttachHover(canvas, points, d => `
    <div class="t-name">${d.n}</div>
    <div class="t-row"><span>Team</span><span>${d.t} ${d.ha==='HOME'?'(H)':'(A)'}</span></div>
    <div class="t-row"><span>Opponent</span><span>${d.o}</span></div>
    <div class="t-row"><span>Date</span><span>${d.d}</span></div>
    <div class="t-row"><span>Pos</span><span>${d.p}</span></div>
    <div class="t-row"><span>G / A</span><span>${d.gl.toFixed(0)} / ${d.as.toFixed(0)}</span></div>
    <div class="t-row"><span>+/−</span><span>${d.pm>0?'+':''}${d.pm.toFixed(0)}</span></div>
    <div class="t-row"><span>PIM</span><span>${d.pim.toFixed(0)}</span></div>
    <div class="t-row"><span>PPP / SHP</span><span>${d.ppp.toFixed(0)} / ${d.shp.toFixed(0)}</span></div>
    <div class="t-row"><span>SOG</span><span>${d.sog.toFixed(0)}</span></div>
    <div class="t-row"><span>HIT / BLK</span><span>${d.ht.toFixed(0)} / ${d.bl.toFixed(0)}</span></div>
    <div class="t-row"><span>FOW</span><span>${d.fow.toFixed(0)}</span></div>
    <div class="t-row"><span>FP (A)</span><span style="color:var(--accent);font-weight:700;">${d.fpA.toFixed(1)}</span></div>
    <div class="t-row"><span>FP (B)</span><span style="color:var(--accent2);font-weight:700;">${d.fpB.toFixed(1)}</span></div>
  `);
}

function skRenderCompare(){
  const data = skChartData;
  const fpAs = data.map(d=>d.fpA), fpBs = data.map(d=>d.fpB);
  const ranksA = skPercentileRanks(fpAs), ranksB = skPercentileRanks(fpBs);
  data.forEach((d,i) => { d.rankA = ranksA[i]; d.rankB = ranksB[i]; d.rankGap = ranksA[i]-ranksB[i]; });

  const r = skPearson(fpAs, fpBs);
  document.getElementById('sk-compare-stats').innerHTML =
    `<span>raw-score correlation (Pearson r): <b>${r.toFixed(3)}</b></span>
     <span>mean |rank gap|: <b>${skMean(data.map(d=>Math.abs(d.rankGap))).toFixed(1)} pts</b></span>`;

  const {canvas, ctx, width, height} = skMakeCanvas('sk-compare-chart-wrap', 380, 460);
  const margin = {top:20, right:30, bottom:50, left:60};
  const sx = v => margin.left + (v/100)*(width-margin.left-margin.right);
  const sy = v => (height-margin.bottom) - (v/100)*(height-margin.bottom-margin.top);
  const ink = skCssVar('--ink-dim'), line = skCssVar('--line'), accent = skCssVar('--accent'), accent2 = skCssVar('--accent2');

  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle = ink; ctx.globalAlpha=0.5; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(sx(0),sy(0)); ctx.lineTo(sx(100),sy(100)); ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha=1;
  ctx.strokeStyle = line; ctx.beginPath();
  ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, height-margin.bottom); ctx.lineTo(width-margin.right, height-margin.bottom); ctx.stroke();
  ctx.fillStyle = ink; ctx.font = '11px -apple-system,sans-serif'; ctx.textAlign='center';
  for (let i=0;i<=10;i+=2) ctx.fillText(i*10, sx(i*10), height-margin.bottom+16);
  ctx.textAlign='right';
  for (let i=0;i<=10;i+=2) ctx.fillText(i*10, margin.left-8, sy(i*10)+4);
  ctx.font='600 12px -apple-system,sans-serif'; ctx.textAlign='center';
  ctx.fillText('System B percentile rank', width/2, height-8);
  ctx.save(); ctx.translate(16, height/2); ctx.rotate(-Math.PI/2); ctx.fillText('System A percentile rank', 0,0); ctx.restore();

  const points = new Array(data.length);
  for (let i=0;i<data.length;i++){
    const d = data[i];
    const px = sx(d.rankB), py = sy(d.rankA);
    points[i] = {px, py, d};
    ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI*2);
    ctx.fillStyle = Math.abs(d.rankGap) > 25 ? accent2 : accent;
    ctx.globalAlpha = 0.4; ctx.fill(); ctx.globalAlpha = 1;
  }
  skAttachHover(canvas, points, d => `
    <div class="t-name">${d.n}</div>
    <div class="t-row"><span>Date</span><span>${d.d}</span></div>
    <div class="t-row"><span>G / A</span><span>${d.gl.toFixed(0)} / ${d.as.toFixed(0)}</span></div>
    <div class="t-row"><span>FP (A)</span><span>${d.fpA.toFixed(1)} (${d.rankA.toFixed(0)}th pct)</span></div>
    <div class="t-row"><span>FP (B)</span><span>${d.fpB.toFixed(1)} (${d.rankB.toFixed(0)}th pct)</span></div>
    <div class="t-row"><span>Rank gap</span><span>${d.rankGap>0?'+':''}${d.rankGap.toFixed(0)}</span></div>
  `);

  const sorted = [...data].sort((a,b)=>b.rankGap-a.rankGap);
  const rows = [...sorted.slice(0,5), ...sorted.slice(-5).reverse()];
  const tbody = document.getElementById('sk-divergence-table');
  tbody.innerHTML = '';
  rows.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.n}</td><td>${d.d}</td><td class="num">${d.gl.toFixed(0)}</td><td class="num">${d.as.toFixed(0)}</td>
      <td class="num">${d.fpA.toFixed(1)}</td><td class="num">${d.fpB.toFixed(1)}</td>
      <td class="num ${d.rankGap>=0?'fp-pos':'fp-neg'}">${d.rankGap>0?'+':''}${d.rankGap.toFixed(0)}</td>`;
    tbody.appendChild(tr);
  });
}

function skRenderEff(){
  const showA = document.getElementById('sk-eff-show-a').checked;
  const showB = document.getElementById('sk-eff-show-b').checked;
  const data = skChartData.filter(d => d.sog > 0);
  const {canvas, ctx, width, height} = skMakeCanvas('sk-eff-chart-wrap', 420, 500);
  const margin = {top:30, right:30, bottom:50, left:60};

  const allX = [];
  if (showA) data.forEach(d=>allX.push(d.fpA));
  if (showB) data.forEach(d=>allX.push(d.fpB));
  if (allX.length === 0){ ctx.fillStyle = skCssVar('--ink-dim'); ctx.font='13px sans-serif'; ctx.fillText('Enable at least one series above.', margin.left, margin.top+10); return; }
  const xMin = Math.min(...allX)*1.05, xMax = Math.max(...allX)*1.05;
  const yMax = 100;
  const sx = v => margin.left + ((v-xMin)/(xMax-xMin))*(width-margin.left-margin.right);
  const sy = v => (height-margin.bottom) - (v/yMax)*(height-margin.bottom-margin.top);

  const ink = skCssVar('--ink-dim'), line = skCssVar('--line'), accent = skCssVar('--accent'), accent2 = skCssVar('--accent2');
  ctx.clearRect(0,0,width,height);
  ctx.strokeStyle = line; ctx.beginPath();
  ctx.moveTo(margin.left, margin.top); ctx.lineTo(margin.left, height-margin.bottom); ctx.lineTo(width-margin.right, height-margin.bottom); ctx.stroke();
  ctx.fillStyle = ink; ctx.font='11px -apple-system,sans-serif'; ctx.textAlign='center';
  for (let i=0;i<=8;i++){ const v = xMin + (xMax-xMin)*i/8; ctx.fillText(v.toFixed(0), sx(v), height-margin.bottom+16); }
  ctx.textAlign='right';
  for (let i=0;i<=5;i++){ const v = yMax*i/5; ctx.fillText(v.toFixed(0)+'%', margin.left-8, sy(v)+4); }
  ctx.font='600 12px -apple-system,sans-serif'; ctx.textAlign='center';
  ctx.fillText('Fantasy Points', width/2, height-8);
  ctx.save(); ctx.translate(16, height/2); ctx.rotate(-Math.PI/2); ctx.fillText('Shooting %', 0,0); ctx.restore();

  const points = [];
  function drawSeries(key, color, label){
    for (let i=0;i<data.length;i++){
      const d = data[i];
      const shPct = d.gl/d.sog*100;
      const px = sx(d[key]), py = sy(shPct);
      points.push({px, py, d, label});
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  if (showB) drawSeries('fpB', accent2, 'System B');
  if (showA) drawSeries('fpA', accent, 'System A');

  ctx.font='600 11px -apple-system,sans-serif'; let lx = margin.left+10;
  if (showA){ ctx.fillStyle=accent; ctx.beginPath(); ctx.arc(lx,margin.top-10,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle=ink; ctx.textAlign='left'; ctx.fillText('System A', lx+10, margin.top-6); lx+=100; }
  if (showB){ ctx.fillStyle=accent2; ctx.beginPath(); ctx.arc(lx,margin.top-10,4,0,Math.PI*2); ctx.fill(); ctx.fillStyle=ink; ctx.textAlign='left'; ctx.fillText('System B', lx+10, margin.top-6); }

  skAttachHover(canvas, points, d => `
    <div class="t-name">${d.n} <span style="font-weight:400;">(${points.find(p=>p.d===d).label})</span></div>
    <div class="t-row"><span>Date</span><span>${d.d}</span></div>
    <div class="t-row"><span>G / SOG</span><span>${d.gl.toFixed(0)} / ${d.sog.toFixed(0)}</span></div>
    <div class="t-row"><span>FP (A)</span><span>${d.fpA.toFixed(1)}</span></div>
    <div class="t-row"><span>FP (B)</span><span>${d.fpB.toFixed(1)}</span></div>
  `);
}

function loadSkaterSeason(rows){
  skInit();
  RAW_SKATERS = rows;
  const n = RAW_SKATERS.length.toLocaleString();
  document.getElementById('sk-row-count').textContent = n;
  document.getElementById('sk-canvas-count').textContent = n;
  setTeamOptions(skFilterTeam, skTeams());
  skRecompute();
}

function skInit(){
  if (skInitialized) return;
  skInitialized = true;

  Object.values(skA).forEach(el => el.addEventListener('input', skRecompute));
  Object.values(skB).forEach(el => el.addEventListener('input', skRecompute));
  [skFilterTeam, skFilterPos, skFilterName].forEach(el => el.addEventListener('input', skRenderMain));
  skChartSystemSel.addEventListener('input', skRenderMain);
  document.getElementById('sk-eff-show-a').addEventListener('input', skRenderEff);
  document.getElementById('sk-eff-show-b').addEventListener('input', skRenderEff);
  document.getElementById('ska-reset').addEventListener('click', () => {
    Object.keys(skA).forEach(k => { skA[k].value = SK_DEFAULTS_A[k]; skA[k].dispatchEvent(new Event('input',{bubbles:true})); });
  });
  document.getElementById('skb-reset').addEventListener('click', () => {
    Object.keys(skB).forEach(k => { skB[k].value = SK_DEFAULTS_B[k]; skB[k].dispatchEvent(new Event('input',{bubbles:true})); });
  });
  window.addEventListener('resize', () => { if(RAW_SKATERS.length && !document.getElementById('page-skaters').hidden){ skRenderMain(); skRenderCompare(); skRenderEff(); } });
}
