
// Goalie page. RAW_DATA is filled per season by site.js (loadGoalieSeason).
let RAW_DATA = [];
const cfgEls = {
  save: document.getElementById('cfg-save'),
  ga: document.getElementById('cfg-ga'),
  shutout: document.getElementById('cfg-shutout'),
  win: document.getElementById('cfg-win'),
  quad: document.getElementById('cfg-quad')
};
const oldEls = {
  save: document.getElementById('old-save'),
  ga: document.getElementById('old-ga'),
  shutout: document.getElementById('old-shutout'),
  win: document.getElementById('old-win')
};

function linkSlider(numberEl, sliderEl){
  const min = parseFloat(sliderEl.min), max = parseFloat(sliderEl.max);
  const clamp = v => Math.min(max, Math.max(min, v));
  sliderEl.addEventListener('input', () => {
    numberEl.value = sliderEl.value;
    numberEl.dispatchEvent(new Event('input', {bubbles:true}));
  });
  numberEl.addEventListener('input', () => {
    const v = parseFloat(numberEl.value);
    if (!isNaN(v)) sliderEl.value = clamp(v);
  });
}
linkSlider(cfgEls.save, document.getElementById('cfg-save-slider'));
linkSlider(cfgEls.ga, document.getElementById('cfg-ga-slider'));
linkSlider(cfgEls.shutout, document.getElementById('cfg-shutout-slider'));
linkSlider(cfgEls.win, document.getElementById('cfg-win-slider'));
linkSlider(oldEls.save, document.getElementById('old-save-slider'));
linkSlider(oldEls.ga, document.getElementById('old-ga-slider'));
linkSlider(oldEls.shutout, document.getElementById('old-shutout-slider'));
linkSlider(oldEls.win, document.getElementById('old-win-slider'));
const filterTeam = document.getElementById('filter-team');
const filterName = document.getElementById('filter-name');
const filterShutout = document.getElementById('filter-shutout');
const tooltip = document.getElementById('tooltip');

function setTeamOptions(selectEl, teams){
  const current = selectEl.value;
  selectEl.length = 1; // keep "All teams"
  teams.forEach(t => {
    const o = document.createElement('option'); o.value = t; o.textContent = t;
    selectEl.appendChild(o);
  });
  selectEl.value = teams.includes(current) ? current : '';
}

function loadGoalieSeason(rows){
  RAW_DATA = rows;
  document.getElementById('row-count').textContent = RAW_DATA.length.toLocaleString();
  setTeamOptions(filterTeam, [...new Set(RAW_DATA.map(d => d.team))].sort());
  recompute();
}

function computeFP(d) {
  const sv = parseFloat(cfgEls.save.value) || 0;
  const ga = parseFloat(cfgEls.ga.value) || 0;
  const so = parseFloat(cfgEls.shutout.value) || 0;
  const wn = parseFloat(cfgEls.win.value) || 0;
  return d.saves * sv + d.ga * ga + (d.shutout ? so : 0) + (d.win === 1 ? wn : 0);
}

// Scoring System B: fully editable, same derived win data as System A.
function computeOldFP(d) {
  const sv = parseFloat(oldEls.save.value) || 0;
  const ga = parseFloat(oldEls.ga.value) || 0;
  const so = parseFloat(oldEls.shutout.value) || 0;
  const wn = parseFloat(oldEls.win.value) || 0;
  return d.saves * sv + d.ga * ga + (d.shutout ? so : 0) + (d.win === 1 ? wn : 0);
}

function percentileRanks(values) {
  const idx = values.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]);
  const ranks = new Array(values.length);
  idx.forEach(([v,i], pos) => { ranks[i] = pos/(values.length-1)*100; });
  return ranks;
}

function pearson(a,b){
  const n = a.length, ma = mean(a), mb = mean(b);
  let num=0, da=0, db=0;
  for (let i=0;i<n;i++){ const xa=a[i]-ma, xb=b[i]-mb; num+=xa*xb; da+=xa*xa; db+=xb*xb; }
  return num / Math.sqrt(da*db);
}

function median(arr) {
  const s = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  return s.length % 2 ? s[mid] : (s[mid-1]+s[mid])/2;
}
function mean(arr){ return arr.reduce((a,b)=>a+b,0)/arr.length; }

function updateFormulaDisplay(){
  const sv = cfgEls.save.value, ga = Math.abs(cfgEls.ga.value), so = cfgEls.shutout.value, wn = cfgEls.win.value;
  document.getElementById('formula-display').textContent =
    `FP = ${sv}×Saves − ${ga}×Goals Against + ${so}×Shutout + ${wn}×Win`;
}

function updateOldFormulaDisplay(){
  const sv = oldEls.save.value, ga = Math.abs(oldEls.ga.value), so = parseFloat(oldEls.shutout.value)||0, wn = parseFloat(oldEls.win.value)||0;
  document.getElementById('old-formula-display').textContent =
    `${sv} × Saves − ${ga} × Goals Against${so ? ` + ${so} × Shutout` : ''}${wn ? ` + ${wn} × Win` : ''}`;
}

function updateExamples(){
  const examples = [
    {saves:25, ga:0, win:1}, {saves:30, ga:2, win:1}, {saves:35, ga:3, win:0},
    {saves:40, ga:6, win:0}, {saves:40, ga:7, win:1}, {saves:45, ga:0, win:1},
    {saves:18, ga:1, win:1}, {saves:35, ga:2, win:0}
  ];
  const sv = parseFloat(cfgEls.save.value)||0, ga_w = parseFloat(cfgEls.ga.value)||0, so_w = parseFloat(cfgEls.shutout.value)||0, wn_w = parseFloat(cfgEls.win.value)||0;
  const osv = parseFloat(oldEls.save.value)||0, oga_w = parseFloat(oldEls.ga.value)||0, oso_w = parseFloat(oldEls.shutout.value)||0, own_w = parseFloat(oldEls.win.value)||0;
  const tbody = document.getElementById('example-table');
  tbody.innerHTML = '';
  examples.forEach(e => {
    const shutout = e.ga === 0 ? 1 : 0;
    const fp = e.saves*sv + e.ga*ga_w + (shutout?so_w:0) + (e.win?wn_w:0);
    const oldFp = e.saves*osv + e.ga*oga_w + (shutout?oso_w:0) + (e.win?own_w:0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.saves} saves, ${e.ga} GA${shutout?' (SO)':''}${e.win?', win':', loss'}</td>
      <td class="num">${e.saves}</td><td class="num">${e.ga}</td><td class="num">${shutout?'Yes':'—'}</td>
      <td class="num ${fp>=0?'fp-pos':'fp-neg'}">${fp.toFixed(1)}</td>
      <td class="num ${oldFp>=0?'fp-pos':'fp-neg'}">${oldFp.toFixed(1)}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('simplify-block').innerHTML =
    `(1 − GA / Saves) × Saves&nbsp;&nbsp;=&nbsp;&nbsp;Saves − (GA / Saves) × Saves&nbsp;&nbsp;=&nbsp;&nbsp;<b style="color:var(--accent)">Saves − GA</b><br>
     <span style="color:var(--ink-dim); font-size:0.8rem;">The save-percentage-weighted version algebraically collapses to the same "saves minus goals against" core this scoring system uses.</span>`;
}

let chartData = [];

function getFiltered(){
  let d = chartData;
  const t = filterTeam.value;
  const n = filterName.value.trim().toLowerCase();
  const so = filterShutout.checked;
  if (t) d = d.filter(r => r.team === t);
  if (n) d = d.filter(r => r.name.toLowerCase().includes(n));
  if (so) d = d.filter(r => r.shutout);
  return d;
}

function recompute(){
  chartData = RAW_DATA.map(d => ({...d, fp: computeFP(d), oldFp: computeOldFP(d)}));
  updateFormulaDisplay();
  updateOldFormulaDisplay();
  updateExamples();
  renderChart();
  renderCompareChart();
  renderSavePctChart();
}

function renderChart(){
  const data = getFiltered();
  document.getElementById('chart-wrap').innerHTML = '';
  const statsEl = document.getElementById('stats-row');
  if (data.length === 0){
    statsEl.innerHTML = '<b>No games match these filters.</b>';
    return;
  }

  const saves = data.map(d=>d.saves);
  const fps = data.map(d=>d.fp);
  const quadMode = cfgEls.quad.value;
  const xMid = quadMode === 'median' ? median(saves) : mean(saves);
  const yMid = quadMode === 'median' ? median(fps) : mean(fps);

  statsEl.innerHTML = `<span><b>${data.length.toLocaleString()}</b> games shown</span>
    <span>median saves: <b>${median(saves).toFixed(1)}</b></span>
    <span>median FP: <b>${median(fps).toFixed(1)}</b></span>
    <span>shutouts: <b>${data.filter(d=>d.shutout).length}</b></span>`;

  const isMobile = window.innerWidth < 640;
  const width = Math.max(document.getElementById('chart-wrap').clientWidth || 900, isMobile ? 340 : 700);
  const height = isMobile ? 420 : 520;
  const margin = {top:20, right:30, bottom:50, left:60};

  const svg = d3.select('#chart-wrap').append('svg')
    .attr('width', width).attr('height', height);

  const x = d3.scaleLinear()
    .domain([0, d3.max(saves)*1.05])
    .range([margin.left, width-margin.right]);
  const y = d3.scaleLinear()
    .domain([d3.min(fps)*1.1 < 0 ? d3.min(fps)*1.1 : -2, d3.max(fps)*1.1])
    .range([height-margin.bottom, margin.top]);

  // quadrant backgrounds
  const xMidPx = x(xMid), yMidPx = y(yMid);
  const quadColor = "var(--panel2)";
  svg.append('rect').attr('x',xMidPx).attr('y',margin.top).attr('width',width-margin.right-xMidPx).attr('height',yMidPx-margin.top).attr('fill','var(--q1)').attr('opacity',0.06);
  svg.append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',xMidPx-margin.left).attr('height',yMidPx-margin.top).attr('fill','var(--q2)').attr('opacity',0.06);
  svg.append('rect').attr('x',margin.left).attr('y',yMidPx).attr('width',xMidPx-margin.left).attr('height',height-margin.bottom-yMidPx).attr('fill','var(--q3)').attr('opacity',0.06);
  svg.append('rect').attr('x',xMidPx).attr('y',yMidPx).attr('width',width-margin.right-xMidPx).attr('height',height-margin.bottom-yMidPx).attr('fill','var(--q4)').attr('opacity',0.06);

  // median lines
  svg.append('line').attr('class','median-line')
    .attr('x1',xMidPx).attr('x2',xMidPx).attr('y1',margin.top).attr('y2',height-margin.bottom);
  svg.append('line').attr('class','median-line')
    .attr('x1',margin.left).attr('x2',width-margin.right).attr('y1',yMidPx).attr('y2',yMidPx);

  // quadrant labels
  const lblY1 = margin.top+14, lblY2 = height-margin.bottom-8;
  svg.append('text').attr('class','quad-label').attr('x',width-margin.right-8).attr('y',lblY1).attr('text-anchor','end').text('HIGH WORKLOAD / HIGH SCORE');
  svg.append('text').attr('class','quad-label').attr('x',margin.left+8).attr('y',lblY1).text('LOW WORKLOAD / HIGH SCORE');
  svg.append('text').attr('class','quad-label').attr('x',margin.left+8).attr('y',lblY2).text('LOW WORKLOAD / LOW SCORE');
  svg.append('text').attr('class','quad-label').attr('x',width-margin.right-8).attr('y',lblY2).attr('text-anchor','end').text('HIGH WORKLOAD / LOW SCORE');

  // axes
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-margin.bottom})`)
    .call(d3.axisBottom(x).ticks(isMobile?5:10));
  svg.append('g').attr('class','axis').attr('transform',`translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(8));

  svg.append('text').attr('class','axis-title').attr('x',width/2).attr('y',height-8).attr('text-anchor','middle').text('Saves (workload)');
  svg.append('text').attr('class','axis-title').attr('transform',`rotate(-90)`).attr('x',-height/2).attr('y',16).attr('text-anchor','middle').text('Fantasy Points');

  // dots
  svg.selectAll('circle.dot')
    .data(data)
    .enter().append('circle')
    .attr('class','dot')
    .attr('cx', d => x(d.saves))
    .attr('cy', d => y(d.fp))
    .attr('r', 3.5)
    .attr('fill', d => d.shutout ? 'var(--accent2)' : (d.fp >= yMid ? 'var(--accent)' : 'var(--q4)'))
    .attr('fill-opacity', 0.55)
    .on('mousemove', function(event, d){
      tooltip.style.opacity = 1;
      tooltip.style.left = (event.clientX + 16) + 'px';
      tooltip.style.top = (event.clientY - 10) + 'px';
      tooltip.innerHTML = `
        <div class="t-name">${d.name}</div>
        <div class="t-row"><span>Team</span><span>${d.team} ${d.ha==='HOME'?'(H)':'(A)'}</span></div>
        <div class="t-row"><span>Opponent</span><span>${d.opp}</span></div>
        <div class="t-row"><span>Date</span><span>${d.date}</span></div>
        <div class="t-row"><span>Saves</span><span>${d.saves.toFixed(0)}</span></div>
        <div class="t-row"><span>Goals Against</span><span>${d.ga.toFixed(0)}</span></div>
        <div class="t-row"><span>Save %</span><span>${d.svpct!=null?d.svpct+'%':'—'}</span></div>
        <div class="t-row"><span>Shutout</span><span>${d.shutout?'Yes':'No'}</span></div>
        <div class="t-row"><span>Win</span><span>${d.win===1?'Yes':(d.win===0?'No':'No decision (SO)')}</span></div>
        <div class="t-row"><span>Fantasy Pts</span><span style="color:var(--accent);font-weight:700;">${d.fp.toFixed(1)}</span></div>
        <div class="t-row"><span>Game ID</span><span>${d.gameId}</span></div>
      `;
    })
    .on('mouseleave', () => { tooltip.style.opacity = 0; });
}

function renderCompareChart(){
  const data = chartData;
  const newFps = data.map(d=>d.fp);
  const oldFps = data.map(d=>d.oldFp);
  const newRanks = percentileRanks(newFps);
  const oldRanks = percentileRanks(oldFps);
  data.forEach((d,i) => { d.newRank = newRanks[i]; d.oldRank = oldRanks[i]; d.rankGap = newRanks[i]-oldRanks[i]; });

  const r = pearson(newFps, oldFps);
  document.getElementById('compare-stats').innerHTML =
    `<span>raw-score correlation (Pearson r): <b>${r.toFixed(3)}</b></span>
     <span>mean |rank gap|: <b>${mean(data.map(d=>Math.abs(d.rankGap))).toFixed(1)} pts</b></span>`;

  const wrapEl = document.getElementById('compare-chart-wrap');
  wrapEl.innerHTML = '';
  const isMobile = window.innerWidth < 640;
  const width = Math.max(wrapEl.clientWidth || 900, isMobile ? 340 : 700);
  const height = isMobile ? 380 : 460;
  const margin = {top:20, right:30, bottom:50, left:60};

  const svg = d3.select('#compare-chart-wrap').append('svg').attr('width',width).attr('height',height);
  const x = d3.scaleLinear().domain([0,100]).range([margin.left, width-margin.right]);
  const y = d3.scaleLinear().domain([0,100]).range([height-margin.bottom, margin.top]);

  svg.append('line').attr('class','median-line')
    .attr('x1',x(0)).attr('y1',y(0)).attr('x2',x(100)).attr('y2',y(100));

  svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(isMobile?5:10));
  svg.append('g').attr('class','axis').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(8));
  svg.append('text').attr('class','axis-title').attr('x',width/2).attr('y',height-8).attr('text-anchor','middle').text('System B percentile rank');
  svg.append('text').attr('class','axis-title').attr('transform','rotate(-90)').attr('x',-height/2).attr('y',16).attr('text-anchor','middle').text('System A percentile rank');

  svg.selectAll('circle.dot').data(data).enter().append('circle')
    .attr('class','dot')
    .attr('cx', d => x(d.oldRank)).attr('cy', d => y(d.newRank)).attr('r',3.2)
    .attr('fill', d => Math.abs(d.rankGap) > 25 ? 'var(--accent2)' : 'var(--accent)')
    .attr('fill-opacity', 0.45)
    .on('mousemove', function(event, d){
      tooltip.style.opacity = 1;
      tooltip.style.left = (event.clientX + 16) + 'px';
      tooltip.style.top = (event.clientY - 10) + 'px';
      tooltip.innerHTML = `
        <div class="t-name">${d.name}</div>
        <div class="t-row"><span>Date</span><span>${d.date}</span></div>
        <div class="t-row"><span>Saves / GA</span><span>${d.saves.toFixed(0)} / ${d.ga.toFixed(0)}</span></div>
        <div class="t-row"><span>FP (A)</span><span>${d.fp.toFixed(1)} (${d.newRank.toFixed(0)}th pct)</span></div>
        <div class="t-row"><span>FP (B)</span><span>${d.oldFp.toFixed(1)} (${d.oldRank.toFixed(0)}th pct)</span></div>
        <div class="t-row"><span>Rank gap</span><span>${d.rankGap>0?'+':''}${d.rankGap.toFixed(0)}</span></div>
      `;
    })
    .on('mouseleave', () => { tooltip.style.opacity = 0; });

  const sorted = [...data].sort((a,b)=>b.rankGap-a.rankGap);
  const top = sorted.slice(0,5);
  const bottom = sorted.slice(-5).reverse();
  const rows = [...top, ...bottom];
  const tbody = document.getElementById('divergence-table');
  tbody.innerHTML = '';
  rows.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.name}</td><td>${d.date}</td><td class="num">${d.saves.toFixed(0)}</td><td class="num">${d.ga.toFixed(0)}</td>
      <td class="num">${d.fp.toFixed(1)}</td><td class="num">${d.oldFp.toFixed(1)}</td>
      <td class="num ${d.rankGap>=0?'fp-pos':'fp-neg'}">${d.rankGap>0?'+':''}${d.rankGap.toFixed(0)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderSavePctChart(){
  const showNew = document.getElementById('svpct-show-new').checked;
  const showOld = document.getElementById('svpct-show-old').checked;
  const data = chartData.filter(d => d.svpct != null);

  const wrapEl = document.getElementById('svpct-chart-wrap');
  wrapEl.innerHTML = '';
  const isMobile = window.innerWidth < 640;
  const width = Math.max(wrapEl.clientWidth || 900, isMobile ? 340 : 700);
  const height = isMobile ? 420 : 500;
  const margin = {top:20, right:30, bottom:50, left:60};

  const allX = [];
  if (showNew) data.forEach(d => allX.push(d.fp));
  if (showOld) data.forEach(d => allX.push(d.oldFp));
  if (allX.length === 0){ wrapEl.innerHTML = '<div class="formula-explain">Enable at least one series above.</div>'; return; }

  const svg = d3.select('#svpct-chart-wrap').append('svg').attr('width',width).attr('height',height);
  const x = d3.scaleLinear().domain([d3.min(allX)*1.05, d3.max(allX)*1.05]).range([margin.left, width-margin.right]);
  const y = d3.scaleLinear().domain([d3.min(data,d=>d.svpct)-2, 100]).range([height-margin.bottom, margin.top]);

  svg.append('g').attr('class','axis').attr('transform',`translate(0,${height-margin.bottom})`).call(d3.axisBottom(x).ticks(isMobile?5:10));
  svg.append('g').attr('class','axis').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(8));
  svg.append('text').attr('class','axis-title').attr('x',width/2).attr('y',height-8).attr('text-anchor','middle').text('Fantasy Points');
  svg.append('text').attr('class','axis-title').attr('transform','rotate(-90)').attr('x',-height/2).attr('y',16).attr('text-anchor','middle').text('Save %');

  function drawSeries(field, color, seriesLabel){
    svg.selectAll(`circle.dot-${field}`).data(data).enter().append('circle')
      .attr('class',`dot dot-${field}`)
      .attr('cx', d => x(d[field])).attr('cy', d => y(d.svpct)).attr('r',3)
      .attr('fill', color).attr('fill-opacity', 0.4)
      .on('mousemove', function(event, d){
        tooltip.style.opacity = 1;
        tooltip.style.left = (event.clientX + 16) + 'px';
        tooltip.style.top = (event.clientY - 10) + 'px';
        tooltip.innerHTML = `
          <div class="t-name">${d.name} <span style="color:${color}; font-weight:400;">(${seriesLabel})</span></div>
          <div class="t-row"><span>Date</span><span>${d.date}</span></div>
          <div class="t-row"><span>Save %</span><span>${d.svpct}%</span></div>
          <div class="t-row"><span>Saves / GA</span><span>${d.saves.toFixed(0)} / ${d.ga.toFixed(0)}</span></div>
          <div class="t-row"><span>FP (A)</span><span>${d.fp.toFixed(1)}</span></div>
          <div class="t-row"><span>FP (B)</span><span>${d.oldFp.toFixed(1)}</span></div>
        `;
      })
      .on('mouseleave', () => { tooltip.style.opacity = 0; });
  }
  if (showOld) drawSeries('oldFp', 'var(--accent2)', 'System B');
  if (showNew) drawSeries('fp', 'var(--accent)', 'System A');

  const legend = svg.append('g').attr('transform',`translate(${margin.left+10},${margin.top})`);
  let lx = 0;
  if (showNew){
    legend.append('circle').attr('cx',lx).attr('cy',0).attr('r',4).attr('fill','var(--accent)');
    legend.append('text').attr('x',lx+10).attr('y',4).attr('class','quad-label').text('System A'); lx += 100;
  }
  if (showOld){
    legend.append('circle').attr('cx',lx).attr('cy',0).attr('r',4).attr('fill','var(--accent2)');
    legend.append('text').attr('x',lx+10).attr('y',4).attr('class','quad-label').text('System B');
  }
}

[cfgEls.save, cfgEls.ga, cfgEls.shutout, cfgEls.win, cfgEls.quad].forEach(el => el.addEventListener('input', recompute));
[oldEls.save, oldEls.ga, oldEls.shutout, oldEls.win].forEach(el => el.addEventListener('input', recompute));
[filterTeam, filterName, filterShutout].forEach(el => el.addEventListener('input', renderChart));
document.getElementById('svpct-show-new').addEventListener('input', renderSavePctChart);
document.getElementById('svpct-show-old').addEventListener('input', renderSavePctChart);
document.getElementById('reset-btn').addEventListener('click', () => {
  cfgEls.save.value = 1; cfgEls.ga.value = -1; cfgEls.shutout.value = 10; cfgEls.win.value = 2;
  document.getElementById('cfg-save-slider').value = 1;
  document.getElementById('cfg-ga-slider').value = -1;
  document.getElementById('cfg-shutout-slider').value = 10;
  document.getElementById('cfg-win-slider').value = 2;
  recompute();
});
document.getElementById('old-reset-btn').addEventListener('click', () => {
  oldEls.save.value = 0.7; oldEls.ga.value = -4; oldEls.shutout.value = 0; oldEls.win.value = 2;
  document.getElementById('old-save-slider').value = 0.7;
  document.getElementById('old-ga-slider').value = -4;
  document.getElementById('old-shutout-slider').value = 0;
  document.getElementById('old-win-slider').value = 2;
  recompute();
});
window.addEventListener('resize', () => { if(RAW_DATA.length && !document.getElementById('page-goalies').hidden){ renderChart(); renderCompareChart(); renderSavePctChart(); } });
