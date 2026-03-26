/* ── CarbonTrack · app.js ── */

const state = {
  logs: [],
  score: 100,
  totalCO2: 0,
  breakdown: { transport: 0, food: 0, home: 0, shopping: 0 },
  treeCount: 23,
  totalPlanted: 31,
  totalLost: 8,
};

/* ── Live Clock ── */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const el = document.getElementById('live-time');
  if (el) el.textContent = h + ':' + m;
}
updateClock();
setInterval(updateClock, 10000);

/* ── Navigation ── */
const PAGE_ORDER = ['home','impact','forest','gamify','social'];
function goPage(id, tabEl, bnIdx) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  const pg = document.getElementById(id);
  if (pg) pg.classList.add('on');
  document.querySelectorAll('.ntab').forEach((t,i) =>
    t.classList.toggle('on', PAGE_ORDER[i] === id));
  document.querySelectorAll('.bni').forEach((b,i) =>
    b.classList.toggle('on', i === bnIdx));
}

/* ── Logger Modal ── */
function openLogger() {
  document.getElementById('logger-modal').classList.add('open');
  renderLoggerForm('transport');
}
function closeLogger() {
  document.getElementById('logger-modal').classList.remove('open');
}

function renderLoggerForm(category) {
  document.querySelectorAll('.log-cat-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.cat === category));
  const factors = CT.EMISSION_FACTORS[category];
  const form = document.getElementById('log-form-body');
  form.innerHTML = '';
  Object.entries(factors).forEach(([key, cfg]) => {
    const row = document.createElement('div');
    row.className = 'log-row';
    row.innerHTML =
      '<div class="log-row-info">' +
        '<div class="log-row-label">' + cfg.label + '</div>' +
        '<div class="log-row-unit">per ' + cfg.unit + ' &middot; <span class="log-row-factor">' + cfg.factor + ' kg CO&#8322;e</span></div>' +
      '</div>' +
      '<div class="log-row-input-wrap">' +
        '<input type="number" min="0" step="0.1" class="log-qty-input" id="qty-' + key + '"' +
        ' placeholder="0"' +
        ' data-category="' + category + '"' +
        ' data-type="' + key + '"' +
        ' data-factor="' + cfg.factor + '"' +
        ' data-label="' + cfg.label + '"' +
        ' data-unit="' + cfg.unit + '"' +
        ' oninput="previewCO2(this)" />' +
        '<span class="log-unit-badge">' + cfg.unit + '</span>' +
      '</div>' +
      '<div class="log-row-preview" id="preview-' + key + '"></div>';
    form.appendChild(row);
  });
}

function previewCO2(input) {
  const qty = parseFloat(input.value) || 0;
  const co2 = Math.round(qty * parseFloat(input.dataset.factor) * 100) / 100;
  const el = document.getElementById('preview-' + input.dataset.type);
  if (el) {
    el.textContent = qty > 0 ? co2 + ' kg CO\u2082' : '';
    el.style.color = co2 > 2 ? 'var(--red)' : co2 > 0.5 ? 'var(--amber)' : 'var(--neon)';
  }
}

function submitLog() {
  const inputs = document.querySelectorAll('.log-qty-input');
  let added = 0;
  inputs.forEach(input => {
    const qty = parseFloat(input.value) || 0;
    if (qty <= 0) return;
    const co2 = Math.round(qty * parseFloat(input.dataset.factor) * 100) / 100;
    state.logs.unshift({
      id: Date.now() + Math.random(),
      category: input.dataset.category,
      type: input.dataset.type,
      label: input.dataset.label,
      unit: input.dataset.unit,
      qty, co2,
      time: new Date(),
    });
    state.breakdown[input.dataset.category] =
      Math.round((state.breakdown[input.dataset.category] + co2) * 100) / 100;
    added++;
  });
  closeLogger();
  if (added > 0) {
    recalcAll();
    goPage('home', null, 0);
    document.querySelectorAll('.ntab')[0].classList.add('on');
  }
}

/* ── Recalculate everything ── */
function recalcAll() {
  state.totalCO2 = Math.round(
    Object.values(state.breakdown).reduce((s,v) => s + v, 0) * 100) / 100;
  state.score = CT.calcCarbonScore(state.totalCO2);
  updateScoreRing();
  updateHomeScreen();
  updateImpactScreen();
  updateLogFeed();
  updateForestStats();
}

/* ── Score Ring ── */
function updateScoreRing() {
  const s = state.score;
  const circle = document.getElementById('score-ring-circle');
  if (circle) {
    const circ = 2 * Math.PI * 64;
    circle.setAttribute('stroke-dasharray', Math.round(circ));
    circle.setAttribute('stroke-dashoffset', Math.round(circ - (s / 100) * circ));
    circle.setAttribute('stroke', s >= 75 ? '#39FF6E' : s >= 50 ? '#FFB800' : '#FF3B3B');
  }
  setEl('score-num', s);
  const lvl = CT.getLevel(s);
  setEl('level-label', lvl.label);
  setEl('level-next', lvl.next
    ? '// ' + (lvl.nextAt - s) + ' pts \u2192 ' + lvl.next
    : '// MAX LEVEL REACHED');
}

/* ── Home Screen ── */
function updateHomeScreen() {
  const { totalCO2, breakdown, score } = state;
  setEl('total-co2-display', totalCO2.toFixed(2) + ' kg CO\u2082');

  const storyMain = document.getElementById('story-main-text');
  if (storyMain) {
    const hrs = (totalCO2 / 0.06).toFixed(0);
    storyMain.innerHTML = totalCO2 === 0
      ? 'No activities logged yet. Tap <em>+</em> to start tracking.'
      : 'You emitted <em>' + totalCO2 + 'kg CO\u2082</em> today \u2014 a tree needs <em>' + hrs + ' hrs</em> to absorb that';
  }
  const storySub = document.getElementById('story-sub-text');
  if (storySub) {
    if (totalCO2 === 0) {
      storySub.textContent = 'Daily target: ' + CT.DAILY_TARGET_KG + 'kg';
    } else if (totalCO2 <= CT.DAILY_TARGET_KG) {
      storySub.textContent = '\u2193 ' + Math.round((1 - totalCO2 / CT.DAILY_TARGET_KG) * 100) + '% below daily target \u2014 keep going!';
    } else {
      storySub.textContent = '\u2191 ' + Math.round((totalCO2 / CT.DAILY_TARGET_KG - 1) * 100) + '% above daily target';
    }
  }

  const total = Math.max(totalCO2, 0.01);
  ['transport','food','home','shopping'].forEach(cat => {
    const pct = Math.round((breakdown[cat] / total) * 100);
    const bar = document.getElementById('bar-' + cat);
    const val = document.getElementById('val-' + cat);
    if (bar) bar.style.width = (totalCO2 === 0 ? 0 : pct) + '%';
    if (val) val.textContent = breakdown[cat].toFixed(1) + 'kg';
  });

  const targetPct = Math.min(Math.round((totalCO2 / CT.DAILY_TARGET_KG) * 100), 100);
  const tbar = document.getElementById('target-bar');
  if (tbar) {
    tbar.style.width = targetPct + '%';
    tbar.style.background = targetPct >= 100 ? 'var(--red)' : targetPct > 75 ? 'var(--amber)' : 'var(--neon)';
  }
  setEl('target-pct', targetPct + '% of daily target (' + CT.DAILY_TARGET_KG + 'kg)');

  // update today's bar in chart
  const todayBar = document.getElementById('today-bar');
  if (todayBar && totalCO2 > 0) {
    const maxV = 6;
    todayBar.style.height = Math.round(Math.min(totalCO2 / maxV, 1) * 62) + 'px';
  }
}

/* ── Impact Screen ── */
function updateImpactScreen() {
  const equivs = CT.getEquivalents(state.totalCO2);
  const container = document.getElementById('equivalents-list');
  if (!container) return;
  container.innerHTML = '';
  equivs.forEach(eq => {
    const div = document.createElement('div');
    div.className = 'equiv';
    div.innerHTML =
      '<div class="eico">' + eq.icon + '</div>' +
      '<div class="etxt">' +
        '<div class="em">' + eq.main + '</div>' +
        '<div class="es">' + eq.sub + '</div>' +
      '</div>';
    container.appendChild(div);
  });
}

/* ── Activity Log Feed ── */
function catIcon(cat) {
  return { transport:'🚗', food:'🍽️', home:'⚡', shopping:'🛍️' }[cat] || '•';
}
function updateLogFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  if (state.logs.length === 0) {
    feed.innerHTML = '<div class="empty-feed">// No activities logged yet.<br>Tap + to log your first activity.</div>';
    return;
  }
  const catBg = {
    transport: 'rgba(57,255,110,.08)',
    food: 'rgba(255,184,0,.08)',
    home: 'rgba(0,245,255,.08)',
    shopping: 'rgba(255,59,59,.08)',
  };
  feed.innerHTML = state.logs.slice(0,15).map(log => {
    const timeStr = log.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const color = log.co2 > 3 ? 'var(--red)' : log.co2 > 1 ? 'var(--amber)' : 'var(--neon)';
    return '<div class="log-feed-item">' +
      '<div class="lfi-dot" style="background:' + (catBg[log.category]||'var(--card)') + '">' + catIcon(log.category) + '</div>' +
      '<div class="lfi-body"><div class="lfi-label">' + log.label + '</div>' +
      '<div class="lfi-meta">' + log.qty + ' ' + log.unit + ' &middot; ' + timeStr + '</div></div>' +
      '<div class="lfi-co2" style="color:' + color + '">' + log.co2 + ' kg</div>' +
      '</div>';
  }).join('');
}

/* ── Weekly Chart ── */
(function buildWeeklyChart() {
  const data = [5.1, 4.3, 3.8, 4.9, 3.5, 0, 0];
  const maxV = 6;
  const wrap = document.getElementById('wbars');
  if (!wrap) return;
  data.forEach((v, i) => {
    const col = document.createElement('div');
    col.className = 'wbar-wrap';
    const bar = document.createElement('div');
    bar.className = 'wbar' + (i === 5 ? ' today' : '');
    if (i === 5) bar.id = 'today-bar';
    bar.style.height = (v ? Math.round((v / maxV) * 62) : 0) + 'px';
    bar.style.background = i === 5 ? 'var(--neon)'
      : v > 4.5 ? 'rgba(255,59,59,.5)' : v > 3.5 ? 'rgba(255,184,0,.4)' : 'rgba(57,255,110,.35)';
    if (i === 5) bar.style.boxShadow = '0 0 6px rgba(57,255,110,.3)';
    col.appendChild(bar);
    wrap.appendChild(col);
  });
})();

/* ── Forest Engine ── */
function treeCol(age) {
  return { mature:{trunk:'#2a1205',canopy:'#0f6626',top:'#13882f'},
           young:{trunk:'#3a1a08',canopy:'#0d5520',top:'#0f6626'},
           sapling:{trunk:'#4a2208',canopy:'#0a3e16',top:'#0d5520'} }[age]
         || {trunk:'#4a2208',canopy:'#0a3e16',top:'#0d5520'};
}
function deadCol() { return {trunk:'#1a0a03',canopy:'#2a1208',top:'#361608'}; }
function makeSVGTree(age, dead) {
  const c = dead ? deadCol() : treeCol(age);
  const s = age==='mature'?1:age==='young'?.75:.55;
  const W=Math.round(26*s), H=Math.round(42*s), cx=W/2;
  const tw=Math.round(4*s), th=Math.round(10*s);
  const r1=Math.round(11*s), r2=Math.round(9*s), r3=Math.round(7*s);
  const ty=H-th;
  const glow = dead ? '' : 'filter:drop-shadow(0 0 3px rgba(57,255,110,.2))';
  return '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="'+glow+'">' +
    '<rect x="'+(cx-tw/2)+'" y="'+ty+'" width="'+tw+'" height="'+th+'" rx="1" fill="'+c.trunk+'"/>' +
    '<circle cx="'+cx+'" cy="'+(ty-r1+4)+'" r="'+r1+'" fill="'+c.canopy+'"/>' +
    '<circle cx="'+(cx-r2*.7)+'" cy="'+(ty-r2+2)+'" r="'+r2+'" fill="'+c.canopy+'"/>' +
    '<circle cx="'+(cx+r2*.7)+'" cy="'+(ty-r2+2)+'" r="'+r2+'" fill="'+c.canopy+'"/>' +
    '<circle cx="'+cx+'" cy="'+(ty-r1-r3*.4)+'" r="'+r3+'" fill="'+c.top+'"/>' +
    '</svg>';
}
function assignAge(i, total) {
  if (i < Math.floor(total*.4)) return 'mature';
  if (i < Math.floor(total*.75)) return 'young';
  return 'sapling';
}
function renderForest(hi=-1, di=-1) {
  const grid = document.getElementById('trees-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i=0; i<state.treeCount; i++) {
    const age = assignAge(i, state.treeCount);
    const div = document.createElement('div');
    div.className = 'tree' + (i===hi?' new-tree':'') + (i===di?' dying':'');
    div.innerHTML = makeSVGTree(age, i===di);
    grid.appendChild(div);
  }
  updateForestStats();
}
function updateForestStats() {
  const pct = Math.round((state.treeCount / Math.max(state.treeCount+state.totalLost,1))*100);
  setEl('tree-count', state.treeCount);
  setEl('co2-offset', '\u2248 '+(state.treeCount*2)+'kg CO\u2082/yr');
  setEl('stat-alive', state.treeCount);
  setEl('stat-total', state.totalPlanted);
  setEl('stat-lost',  state.totalLost);
  setEl('ring-pct',   pct+'%');
  const ring = document.getElementById('ring-fill');
  if (ring) {
    const dash = 289;
    ring.setAttribute('stroke-dashoffset', Math.round(dash-(dash*pct/100)));
    ring.setAttribute('stroke', pct>=70?'var(--neon)':pct>=40?'var(--amber)':'var(--red)');
  }
}
function showToast(msg, color) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent=msg; t.style.color=color; t.style.borderColor=color;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}
function addTree() {
  state.treeCount++; state.totalPlanted++;
  renderForest(state.treeCount-1);
  showToast('+ TREE PLANTED','var(--neon)');
}
function removeTree() {
  if (state.treeCount<=1) return;
  state.totalLost++;
  showToast('\u2212 TREE WITHERED','var(--red)');
  renderForest(-1, state.treeCount-1);
  setTimeout(()=>{ state.treeCount--; renderForest(); }, 550);
}

/* ── Leaderboard ── */
function swLb(key) {
  ['f','c','g'].forEach(k=>{
    const el=document.getElementById('lbs-'+k);
    if (el) el.className='lbs '+(k===key?'on':'off');
  });
}

/* ── Utility ── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Init ── */
renderForest();
recalcAll();
