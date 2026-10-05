// Site shell: season selector, per-season data loading, and tab routing.
// Data lives in data/<season>/{goalies,skaters}.json; data/seasons.json lists what's available.

const seasonSelect = document.getElementById('season-select');
const loadingEl = document.getElementById('loading');
const cache = {}; // "2025/goalies" -> rows

let seasons = [];
let currentSeason = null;
let loadedFor = {goalies: null, skaters: null}; // season each page last rendered

async function fetchRows(season, kind){
  const key = `${season}/${kind}`;
  if (!cache[key]){
    const res = await fetch(`data/${key}.json`);
    if (!res.ok) throw new Error(`Couldn't load ${key} (${res.status})`);
    cache[key] = await res.json();
  }
  return cache[key];
}

function seasonLabel(season){
  const s = seasons.find(x => x.season === season);
  return s ? s.label : `${season}-${String(season + 1).slice(2)}`;
}

function setLoading(msg){
  loadingEl.textContent = msg || '';
  loadingEl.hidden = !msg;
}

async function ensurePageData(page){
  if (loadedFor[page] === currentSeason) return;
  const season = currentSeason;
  setLoading(`Loading ${seasonLabel(season)} ${page}…`);
  try {
    const rows = await fetchRows(season, page);
    if (season !== currentSeason) return; // user switched season mid-load
    if (page === 'goalies') loadGoalieSeason(rows); else loadSkaterSeason(rows);
    loadedFor[page] = season;
    setLoading('');
  } catch (err){
    setLoading(err.message);
  }
}

function currentPage(){
  return (location.hash || '#goalies').replace('#', '') === 'skaters' ? 'skaters' : 'goalies';
}

function showPage(name){
  document.getElementById('page-goalies').hidden = (name !== 'goalies');
  document.getElementById('page-skaters').hidden = (name !== 'skaters');
  document.querySelectorAll('.topnav a.tab').forEach(a => a.classList.toggle('active', a.dataset.page === name));
  ensurePageData(name);
}

function setSeason(season){
  currentSeason = season;
  seasonSelect.value = String(season);
  const label = seasonLabel(season);
  document.querySelectorAll('.season-label').forEach(el => { el.textContent = label; });
  document.title = `NHL Fantasy Scoring Lab — ${label}`;
  const url = new URL(location.href);
  url.searchParams.set('season', season);
  history.replaceState(null, '', url);
  showPage(currentPage());
}

async function init(){
  try {
    const res = await fetch('data/seasons.json');
    seasons = (await res.json()).sort((a, b) => b.season - a.season);
  } catch (err){
    setLoading("Couldn't load the season list.");
    return;
  }
  seasons.forEach(s => {
    const o = document.createElement('option');
    o.value = s.season; o.textContent = s.label;
    seasonSelect.appendChild(o);
  });
  seasonSelect.addEventListener('change', () => setSeason(parseInt(seasonSelect.value, 10)));
  window.addEventListener('hashchange', () => showPage(currentPage()));

  const requested = parseInt(new URLSearchParams(location.search).get('season'), 10);
  setSeason(seasons.some(s => s.season === requested) ? requested : seasons[0].season);
}

init();
