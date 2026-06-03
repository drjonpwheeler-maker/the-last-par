// ═══════════════════════════════════════════════════════════════════════════
// THE LAST PAR — App Logic
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'lastpar_round';
const AVATAR_COLORS = ['#4caf6e','#c9a84c','#5b9bd5','#e07b5b','#a06bca','#5bb8b4','#d45b8e','#8bc34a'];

// ── State ─────────────────────────────────────────────────────────────────
let state = {
  screen: 'welcome',
  courseName: '',
  pars: Array(18).fill(4),
  hcpRatings: Array(18).fill(0).map((_,i) => i+1), // default 1-18
  players: [],       // {name, hcp}
  scores: {},        // { playerIdx: [gross1..gross18] }  null = not entered
  tieWinner: null,   // player index if manually chosen
};

// ── Handicap Logic ────────────────────────────────────────────────────────
function strokesOnHole(playerHcp, holeHcpRating) {
  const base  = Math.floor(playerHcp / 18);
  const extra = (playerHcp % 18) >= holeHcpRating ? 1 : 0;
  return base + extra;
}

function netScore(gross, playerHcp, holeHcpRating) {
  return gross - strokesOnHole(playerHcp, holeHcpRating);
}

// Returns 'par','birdie','eagle','double','bogey', or null
function netCategory(gross, par, playerHcp, holeHcpRating) {
  if (gross === null || gross === undefined || gross === '') return null;
  const net = netScore(Number(gross), playerHcp, holeHcpRating);
  const diff = net - par;
  if (diff <= -3) return 'double';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0)  return 'par';
  return 'bogey';
}

// Dollar contribution of a single qualifying score
function scoreDollars(cat) {
  return { double: 4, eagle: 3, birdie: 2, par: 1 }[cat] || 0;
}

// Total pot for one hole: sum(scoreDollars per qualifying player) × playerCount
function holePot(holeIdx) {
  const n = state.players.length;
  if (n === 0) return 0;
  let qualSum = 0;
  for (let pi = 0; pi < n; pi++) {
    const gross = (state.scores[pi] || [])[holeIdx];
    if (gross === null || gross === undefined || gross === '') continue;
    const cat = netCategory(gross, state.pars[holeIdx], state.players[pi].hcp, state.hcpRatings[holeIdx]);
    qualSum += scoreDollars(cat);
  }
  return qualSum * n;
}

function totalPot() {
  let total = 0;
  for (let h = 0; h < 18; h++) total += holePot(h);
  return total;
}

// Best category on a hole (highest-value qualifying net score)
function holeBestCategory(holeIdx) {
  const cats = ['double','eagle','birdie','par'];
  const n = state.players.length;
  for (const cat of cats) {
    for (let pi = 0; pi < n; pi++) {
      const gross = (state.scores[pi] || [])[holeIdx];
      if (gross === null || gross === undefined || gross === '') continue;
      if (netCategory(gross, state.pars[holeIdx], state.players[pi].hcp, state.hcpRatings[holeIdx]) === cat) {
        return cat;
      }
    }
  }
  return null;
}

// Players who made the best category on a hole
function holeBestPlayers(holeIdx) {
  const best = holeBestCategory(holeIdx);
  if (!best) return [];
  const n = state.players.length;
  const result = [];
  for (let pi = 0; pi < n; pi++) {
    const gross = (state.scores[pi] || [])[holeIdx];
    if (gross === null || gross === undefined || gross === '') continue;
    if (netCategory(gross, state.pars[holeIdx], state.players[pi].hcp, state.hcpRatings[holeIdx]) === best) {
      result.push(pi);
    }
  }
  return result;
}

// Find the last qualifying hole (18→1)
function lastQualifyingHole() {
  for (let h = 17; h >= 0; h--) {
    if (holeBestCategory(h) !== null) return h;
  }
  return null;
}

function winnerInfo() {
  const lqh = lastQualifyingHole();
  if (lqh === null) return null;
  const players = holeBestPlayers(lqh);
  const cat = holeBestCategory(lqh);
  const isTie = players.length > 1;
  const winner = isTie
    ? (state.tieWinner !== null ? state.tieWinner : null)
    : players[0];
  return { holeIdx: lqh, cat, tiedPlayers: players, isTie, winner };
}

// ── Persistence ───────────────────────────────────────────────────────────
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch(e) {}
}
function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  state = {
    screen: 'welcome',
    courseName: '',
    pars: Array(18).fill(4),
    hcpRatings: Array(18).fill(0).map((_,i) => i+1),
    players: [],
    scores: {},
    tieWinner: null,
  };
}

// ── Screen routing ────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${id}`);
  if (el) {
    el.classList.add('active');
    el.scrollTop = 0;
  }
  state.screen = id;
  saveState();
}

// ── Toast ─────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Welcome screen ────────────────────────────────────────────────────────
function renderWelcome() {
  const hasSaved = !!localStorage.getItem(STORAGE_KEY);
  const resumeBtn = document.getElementById('btn-resume');
  if (hasSaved && state.players.length > 0) {
    resumeBtn.style.display = 'flex';
    document.getElementById('resume-info').textContent =
      `${state.courseName || 'Saved round'} · ${state.players.length} players`;
  } else {
    resumeBtn.style.display = 'none';
  }
}

// ── Course setup ──────────────────────────────────────────────────────────
function renderCourseSetup() {
  document.getElementById('course-name-input').value = state.courseName;
  const grid = document.getElementById('course-holes-grid');
  grid.innerHTML = '';

  // Header
  grid.insertAdjacentHTML('beforeend', `
    <div class="course-grid-header">
      <div>Hole</div><div>Par</div><div>HCP Rating</div>
    </div>
  `);

  for (let h = 0; h < 18; h++) {
    if (h === 0) grid.insertAdjacentHTML('beforeend', `<div class="nine-label">Front Nine</div>`);
    if (h === 9) grid.insertAdjacentHTML('beforeend', `<div class="nine-label">Back Nine</div>`);

    grid.insertAdjacentHTML('beforeend', `
      <div class="course-row" id="course-row-${h}">
        <div class="hole-num">${h+1}</div>
        <input type="number" min="3" max="6" value="${state.pars[h]}"
               data-hole="${h}" data-field="par"
               inputmode="numeric" id="par-input-${h}">
        <input type="number" min="1" max="18" value="${state.hcpRatings[h]}"
               data-hole="${h}" data-field="hcp"
               inputmode="numeric" id="hcp-input-${h}">
      </div>
    `);
  }

  grid.addEventListener('change', e => {
    const inp = e.target;
    const h = parseInt(inp.dataset.hole);
    const v = parseInt(inp.value);
    if (inp.dataset.field === 'par') {
      state.pars[h] = isNaN(v) ? 4 : Math.min(6, Math.max(3, v));
      inp.value = state.pars[h];
    } else {
      state.hcpRatings[h] = isNaN(v) ? h+1 : Math.min(18, Math.max(1, v));
      inp.value = state.hcpRatings[h];
    }
    saveState();
  });
}

// ── Players setup ─────────────────────────────────────────────────────────
function renderPlayersSetup() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';

  state.players.forEach((p, i) => {
    const initials = p.name ? p.name.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : (i+1).toString();
    list.insertAdjacentHTML('beforeend', `
      <div class="player-card" id="player-card-${i}">
        <div class="player-avatar av-${i % 8}">${initials}</div>
        <div class="player-fields">
          <input type="text" placeholder="Player name" value="${p.name}"
                 data-player="${i}" data-field="name" maxlength="20">
          <input type="number" placeholder="HCP" value="${p.hcp === 0 ? '' : p.hcp}"
                 min="0" max="54" data-player="${i}" data-field="hcp"
                 inputmode="numeric">
        </div>
        <button class="player-remove" data-player="${i}" title="Remove">✕</button>
      </div>
    `);
  });

  const addBtn = document.getElementById('add-player-btn');
  addBtn.style.display = state.players.length < 8 ? 'flex' : 'none';

  list.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = parseInt(e.target.dataset.player);
      const field = e.target.dataset.field;
      if (field === 'name') {
        state.players[i].name = e.target.value;
        // Update avatar initials
        const initials = e.target.value.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || (i+1).toString();
        const avatar = document.querySelector(`#player-card-${i} .player-avatar`);
        if (avatar) avatar.textContent = initials;
      } else {
        state.players[i].hcp = parseInt(e.target.value) || 0;
      }
      saveState();
    });
  });

  list.querySelectorAll('.player-remove').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = parseInt(e.target.dataset.player);
      state.players.splice(i, 1);
      // Re-index scores
      const newScores = {};
      Object.keys(state.scores).forEach(k => {
        const ki = parseInt(k);
        if (ki < i) newScores[ki] = state.scores[k];
        else if (ki > i) newScores[ki-1] = state.scores[k];
      });
      state.scores = newScores;
      saveState();
      renderPlayersSetup();
    });
  });
}

// ── Scorecard ─────────────────────────────────────────────────────────────
const CAT_LABELS = { double:'Double Eagle 🦅🦅', eagle:'Eagle 🦅', birdie:'Birdie 🐦', par:'Par ✅' };
const CAT_SHORT  = { double:'2-Eagle', eagle:'Eagle', birdie:'Birdie', par:'Par' };

function renderScorecard() {
  // Pot total
  document.getElementById('pot-total').textContent = `$${totalPot()}`;
  document.getElementById('sc-course-name').textContent = state.courseName || 'Round';

  // Last par banner
  const wi = winnerInfo();
  const banner = document.getElementById('last-par-banner');
  if (wi) {
    banner.style.display = 'flex';
    const name = wi.winner !== null
      ? state.players[wi.winner].name
      : (wi.isTie ? wi.tiedPlayers.map(i=>state.players[i].name).join(' / ') + ' (TIE)' : state.players[wi.tiedPlayers[0]]?.name);
    document.getElementById('lp-current-leader').textContent =
      `Hole ${wi.holeIdx+1} — ${CAT_SHORT[wi.cat]} — ${name}`;
  } else {
    banner.style.display = 'none';
  }

  // Hole cards
  const container = document.getElementById('hole-cards');
  const expanded = new Set();
  container.querySelectorAll('.hole-card.expanded').forEach(c => expanded.add(parseInt(c.dataset.hole)));

  container.innerHTML = '';

  for (let h = 0; h < 18; h++) {
    const par = state.pars[h];
    const hcpR = state.hcpRatings[h];
    const pot = holePot(h);
    const bestCat = holeBestCategory(h);
    const isExpanded = expanded.has(h) || (bestCat === null && h === firstUnscoredHole());
    const isLast = wi && wi.holeIdx === h;

    let cardClass = 'hole-card';
    if (bestCat) cardClass += ' has-qualifier';
    if (isExpanded) cardClass += ' expanded';
    if (isLast) cardClass += ' current-hole';

    let potBadge = pot > 0 ? `<span class="hole-pot-badge">$${pot}</span>` : '';
    let qualBadge = bestCat ? `<span style="font-size:13px;color:var(--green-accent)">${CAT_LABELS[bestCat]}</span>` : '';

    // Build player score rows
    let scoreRows = `
      <div class="score-row">
        <div class="score-row-header">Player</div>
        <div class="score-row-header" style="text-align:center">Gross</div>
        <div class="score-row-header" style="text-align:center">Net</div>
        <div class="score-row-header" style="text-align:center">Result</div>
      </div>
    `;

    for (let pi = 0; pi < state.players.length; pi++) {
      const p = state.players[pi];
      const gross = (state.scores[pi] || [])[h];
      const strokes = strokesOnHole(p.hcp, hcpR);
      const cat = gross !== null && gross !== undefined && gross !== ''
        ? netCategory(gross, par, p.hcp, hcpR) : null;
      const net = gross !== null && gross !== undefined && gross !== ''
        ? netScore(Number(gross), p.hcp, hcpR) : null;

      let catClass = 'net-score-badge';
      let catText = '—';
      if (cat === 'par')    { catClass += ' net-par';    catText = 'Net Par'; }
      if (cat === 'birdie') { catClass += ' net-birdie'; catText = 'Net Birdie'; }
      if (cat === 'eagle')  { catClass += ' net-eagle';  catText = 'Net Eagle'; }
      if (cat === 'double') { catClass += ' net-double'; catText = 'Net 2-Eagle'; }
      if (cat === 'bogey')  { catClass += ' net-bogey';  catText = '+' + (net - par); }

      const strokesHint = strokes > 0 ? `<div class="strokes-given">${strokes} stroke${strokes>1?'s':''}</div>` : '';

      scoreRows += `
        <div class="score-row">
          <div class="player-score-name">
            <span class="player-dot" style="background:${AVATAR_COLORS[pi%8]}"></span>
            ${escHtml(p.name || `P${pi+1}`)}
          </div>
          <div class="score-input-wrap">
            <input type="number" min="1" max="15"
                   value="${gross !== null && gross !== undefined && gross !== '' ? gross : ''}"
                   placeholder="${par}"
                   inputmode="numeric"
                   data-hole="${h}" data-player="${pi}">
            ${strokesHint}
          </div>
          <div style="text-align:center;font-size:15px;font-weight:700;color:${net!==null?'var(--cream)':'var(--gray-dim)'}">
            ${net !== null ? net : '—'}
          </div>
          <div class="${catClass}">${cat ? catText : '—'}</div>
        </div>
      `;
    }

    // Summary row
    let summaryRow = '';
    if (pot > 0) {
      const qualNames = holeBestPlayers(h).map(i => state.players[i]?.name || `P${i+1}`).join(', ');
      summaryRow = `
        <div class="hole-summary-row">
          <span class="hole-qualifier-info">${qualNames}</span>
          <span class="hole-pot-info">+$${pot} to pot</span>
        </div>
      `;
    }

    container.insertAdjacentHTML('beforeend', `
      <div class="${cardClass}" data-hole="${h}" id="hole-card-${h}">
        <div class="hole-header">
          <div class="hole-header-left">
            <div class="hole-number-badge">${h+1}</div>
            <div>
              <div style="font-weight:700;font-size:15px">Hole ${h+1}</div>
              <div class="hole-par-info">Par <strong>${par}</strong> · HCP ${hcpR}</div>
            </div>
          </div>
          <div class="hole-header-right">
            ${qualBadge}
            ${potBadge}
            <span class="hole-chevron">▼</span>
          </div>
        </div>
        <div class="hole-body">
          ${scoreRows}
          ${summaryRow}
        </div>
      </div>
    `);
  }

  // Attach events
  container.querySelectorAll('.hole-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const card = hdr.closest('.hole-card');
      card.classList.toggle('expanded');
    });
  });

  container.querySelectorAll('input[data-hole]').forEach(inp => {
    inp.addEventListener('change', e => {
      const h = parseInt(e.target.dataset.hole);
      const pi = parseInt(e.target.dataset.player);
      if (!state.scores[pi]) state.scores[pi] = Array(18).fill(null);
      const v = e.target.value.trim();
      state.scores[pi][h] = v === '' ? null : parseInt(v);
      state.tieWinner = null;
      saveState();
      renderScorecard();
      // Re-expand this hole card
      const card = document.getElementById(`hole-card-${h}`);
      if (card) card.classList.add('expanded');
    });
    // Prevent form-level collapse on input focus
    inp.addEventListener('click', e => e.stopPropagation());
  });
}

function firstUnscoredHole() {
  for (let h = 0; h < 18; h++) {
    const allScored = state.players.every((_, pi) => {
      const g = (state.scores[pi] || [])[h];
      return g !== null && g !== undefined && g !== '';
    });
    if (!allScored) return h;
  }
  return 17;
}

// ── Winner screen ─────────────────────────────────────────────────────────
function renderWinner() {
  const wi = winnerInfo();
  const pot = totalPot();

  if (!wi || wi.winner === null) {
    // Need tiebreak or no scores
    renderTiebreaker(wi, pot);
    return;
  }

  const winner = state.players[wi.winner];
  document.getElementById('winner-content').innerHTML = `
    <div class="winner-trophy">
      <span class="trophy-icon">🏆</span>
      <div class="winner-name">${escHtml(winner.name)}</div>
      <div class="winner-sub">wins The Last Par</div>
      <div class="winner-amount">$${pot}</div>
    </div>

    <div class="winner-details">
      <div class="winner-detail-row">
        <span class="wd-label">Winning hole</span>
        <span class="wd-value gold">Hole ${wi.holeIdx+1}</span>
      </div>
      <div class="winner-detail-row">
        <span class="wd-label">Winning score</span>
        <span class="wd-value">${CAT_LABELS[wi.cat]}</span>
      </div>
      <div class="winner-detail-row">
        <span class="wd-label">Winning handicap</span>
        <span class="wd-value">${winner.hcp}</span>
      </div>
      <div class="winner-detail-row">
        <span class="wd-label">Total pot</span>
        <span class="wd-value gold">$${pot}</span>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" onclick="showScreen('scorecard')">← Back to scores</button>
      <button class="btn btn-danger btn-sm" onclick="confirmNewRound()">New Round</button>
    </div>
  `;
}

function renderTiebreaker(wi, pot) {
  if (!wi) {
    document.getElementById('winner-content').innerHTML = `
      <div class="text-center" style="padding:40px 0">
        <div style="font-size:48px;margin-bottom:16px">⛳</div>
        <div style="font-family:var(--font-display);font-size:24px;color:var(--gray-muted)">No qualifying scores yet</div>
        <div class="text-muted mt-8">Enter scores on the scorecard</div>
      </div>
      <button class="btn btn-ghost mt-16" onclick="showScreen('scorecard')">← Back to scorecard</button>
    `;
    return;
  }

  const tiedNames = wi.tiedPlayers.map(i => state.players[i]);
  const tieButtons = wi.tiedPlayers.map(i => `
    <button class="tie-player-btn ${state.tieWinner === i ? 'selected' : ''}"
            onclick="selectTieWinner(${i})">
      ${escHtml(state.players[i].name)}
    </button>
  `).join('');

  document.getElementById('winner-content').innerHTML = `
    <div style="text-align:center;padding:24px 0 16px">
      <div style="font-size:56px;margin-bottom:12px">🤝</div>
      <div style="font-family:var(--font-display);font-size:28px;color:var(--gold)">Tie on Hole ${wi.holeIdx+1}!</div>
      <div class="text-muted mt-8">${CAT_LABELS[wi.cat]} — multiple players</div>
    </div>

    <div class="tiebreaker">
      <h3>Who wins the pot?</h3>
      <p>Multiple players made a ${CAT_SHORT[wi.cat]} on hole ${wi.holeIdx+1}. The group picks the winner.</p>
      ${tieButtons}
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" onclick="showScreen('scorecard')">← Back</button>
    </div>
  `;
}

function selectTieWinner(playerIdx) {
  state.tieWinner = playerIdx;
  saveState();
  renderWinner();
}

function confirmNewRound() {
  if (confirm('Start a new round? This will clear all current scores.')) {
    clearState();
    renderWelcome();
    showScreen('welcome');
  }
}

// ── Validation helpers ────────────────────────────────────────────────────
function validateCourse() {
  state.courseName = document.getElementById('course-name-input').value.trim();
  for (let h = 0; h < 18; h++) {
    const pv = parseInt(document.getElementById(`par-input-${h}`)?.value);
    const hv = parseInt(document.getElementById(`hcp-input-${h}`)?.value);
    state.pars[h] = isNaN(pv) ? 4 : Math.min(6, Math.max(3, pv));
    state.hcpRatings[h] = isNaN(hv) ? h+1 : Math.min(18, Math.max(1, hv));
  }
  // Check HCP ratings 1-18 are unique
  const ratings = state.hcpRatings.slice().sort((a,b)=>a-b);
  const unique = new Set(ratings);
  if (unique.size < 18) {
    toast('⚠️ HCP ratings should be unique (1–18)');
  }
  saveState();
  return true;
}

function validatePlayers() {
  if (state.players.length < 2) {
    toast('Add at least 2 players');
    return false;
  }
  const missing = state.players.find(p => !p.name.trim());
  if (missing) {
    toast('All players need a name');
    return false;
  }
  return true;
}

// ── Utility ───────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Icon generation (canvas → PNG) ───────────────────────────────────────
function generateIcons() {
  ['192','512'].forEach(size => {
    const sz = parseInt(size);
    const canvas = document.createElement('canvas');
    canvas.width = sz; canvas.height = sz;
    const ctx = canvas.getContext('2d');
    // Background
    ctx.fillStyle = '#0a1a0e';
    ctx.fillRect(0,0,sz,sz);
    // Circle
    const cx = sz/2, cy = sz/2, r = sz*0.44;
    const grad = ctx.createRadialGradient(cx,cy*0.8,0,cx,cy,r);
    grad.addColorStop(0,'#2d6a3f');
    grad.addColorStop(1,'#122318');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fill();
    // Flag emoji
    ctx.font = `${sz*0.42}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⛳', cx, cy);
    // Store as data URL in link tag (for iOS home screen)
    const link = document.querySelector(`link[sizes="${size}x${size}"]`);
    if (link) link.href = canvas.toDataURL('image/png');
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  generateIcons();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // ── Button wiring ────────────────────────────────────────────────────────
  document.getElementById('btn-new-round').addEventListener('click', () => {
    clearState();
    renderCourseSetup();
    showScreen('course');
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    if (state.screen === 'scorecard' || state.screen === 'winner') {
      renderScorecard();
      showScreen(state.screen);
    } else {
      renderScorecard();
      showScreen('scorecard');
    }
  });

  // Course → Players
  document.getElementById('btn-course-next').addEventListener('click', () => {
    validateCourse();
    if (state.players.length === 0) {
      state.players = [{ name: '', hcp: 0 }, { name: '', hcp: 0 }];
    }
    renderPlayersSetup();
    showScreen('players');
  });

  document.getElementById('btn-course-back').addEventListener('click', () => showScreen('welcome'));

  // Players → Scorecard
  document.getElementById('btn-players-next').addEventListener('click', () => {
    if (!validatePlayers()) return;
    renderScorecard();
    showScreen('scorecard');
  });

  document.getElementById('btn-players-back').addEventListener('click', () => {
    renderCourseSetup();
    showScreen('course');
  });

  // Add player
  document.getElementById('add-player-btn').addEventListener('click', () => {
    if (state.players.length >= 8) { toast('Maximum 8 players'); return; }
    state.players.push({ name: '', hcp: 0 });
    renderPlayersSetup();
    // Focus new name input
    const inputs = document.querySelectorAll('#player-list input[data-field="name"]');
    if (inputs.length) inputs[inputs.length-1].focus();
  });

  // Scorecard nav
  document.getElementById('btn-sc-back').addEventListener('click', () => {
    renderPlayersSetup();
    showScreen('players');
  });

  document.getElementById('btn-see-winner').addEventListener('click', () => {
    renderWinner();
    showScreen('winner');
  });

  document.getElementById('btn-winner-back').addEventListener('click', () => {
    renderScorecard();
    showScreen('scorecard');
  });

  // ── Restore screen ───────────────────────────────────────────────────────
  const sc = state.screen;
  if (sc === 'scorecard' && state.players.length > 0) {
    renderScorecard();
    showScreen('scorecard');
  } else if (sc === 'winner' && state.players.length > 0) {
    renderWinner();
    showScreen('winner');
  } else if (sc === 'course') {
    renderCourseSetup();
    showScreen('course');
  } else if (sc === 'players' && state.players.length > 0) {
    renderPlayersSetup();
    showScreen('players');
  } else {
    renderWelcome();
    showScreen('welcome');
  }
});
