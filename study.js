/* ════════════════════════════════════════════════════════════
   STUDY TRACKER
════════════════════════════════════════════════════════════ */
let studyActive = {};           // uid -> { mode, running, elapsed, remaining, durationSec, flushedSec, intervalId }
let studyCalYear, studyCalMonth, studySelCalDate = null;
const SR_CIRC = 2 * Math.PI * 86; // r=86

function initStudyCal() { const n = logicalNow(); studyCalYear = n.getFullYear(); studyCalMonth = n.getMonth(); }

function renderStudyPage() {
  if (!studyCalYear) initStudyCal();
  renderStudyChips();
  renderStudyRings();
  renderStudyStats();
}

function renderStudyChips() {
  const row = document.getElementById('studyChipRow');
  if (!row) return;
  const users = userList();
  if (!users.length) { row.innerHTML = '<div class="study-empty" style="padding:.5rem">Add a person on the Question Tracker page first.</div>'; return; }
  row.innerHTML = users.map(u =>
    `<button class="study-chip ${studyActive[u.id] ? 'active' : ''}" onclick="toggleStudyUser('${u.id}')">${escHtml(u.name)}</button>`).join('');
}

function toggleStudyUser(uid) {
  if (studyActive[uid]) {
    removeStudyUser(uid);
  } else {
    studyActive[uid] = {
      mode: 'stopwatch', running: false, elapsed: 0, remaining: 0, durationSec: 25 * 60, flushedSec: 0, intervalId: null,
      pomoPhase: 'work', pomoWorkMin: 25, pomoBreakMin: 5, pomoLongBreakMin: 15, pomoCyclesBeforeLong: 4, pomoCount: 0
    };
    renderStudyChips();
    renderStudyRings();
  }
}

function removeStudyUser(uid) {
  const t = studyActive[uid];
  if (!t) return;
  if (t.intervalId) clearInterval(t.intervalId);
  flushStudyTime(uid);
  delete studyActive[uid];
  renderStudyChips();
  renderStudyRings();
}

function fmtHMS(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function renderStudyRings() {
  const host = document.getElementById('studyRings');
  const empty = document.getElementById('studyEmpty');
  const uids = Object.keys(studyActive);
  host.dataset.count = String(uids.length);
  if (!uids.length) {
    host.innerHTML = '<div class="study-empty" id="studyEmpty">Select a person above to start tracking focus time.</div>';
    return;
  }
  host.innerHTML = uids.map(uid => buildRingHTML(uid)).join('');
  uids.forEach(uid => updateRingVisual(uid));
}

function buildRingHTML(uid) {
  const t = studyActive[uid];
  const name = state.users[uid]?.name || '?';
  return `
  <div class="study-ring-card ${t.mode === 'pomodoro' && t.pomoPhase !== 'work' ? 'is-break' : ''}" data-uid="${uid}">
    <div class="sr-name">${escHtml(name)}</div>
    <div class="sr-mode-toggle">
      <button class="sr-mode-btn ${t.mode === 'stopwatch' ? 'active' : ''}" onclick="setStudyMode('${uid}','stopwatch')">Stopwatch</button>
      <button class="sr-mode-btn ${t.mode === 'timer' ? 'active' : ''}" onclick="setStudyMode('${uid}','timer')">Timer</button>
      <button class="sr-mode-btn ${t.mode === 'pomodoro' ? 'active' : ''}" onclick="setStudyMode('${uid}','pomodoro')">Pomodoro</button>
    </div>
    <div class="sr-duration-row" id="srDurRow_${uid}" style="${(t.mode === 'timer' || t.mode === 'pomodoro') && !t.running ? '' : 'display:none'}">
      ${t.mode === 'pomodoro'
        ? `<input type="number" min="5" max="120" id="srDurInp_${uid}" value="${t.pomoWorkMin}" onchange="setStudyDuration('${uid}',this.value)"> min work · ${t.pomoBreakMin} min break`
        : `<input type="number" min="1" max="300" id="srDurInp_${uid}" value="${Math.round(t.durationSec/60)}" onchange="setStudyDuration('${uid}',this.value)"> min`}
    </div>
    <div class="sr-ring-wrap">
      <svg class="sr-ring-svg" viewBox="0 0 200 200">
        <defs>
          <clipPath id="srClip_${uid}"><circle cx="100" cy="100" r="86"/></clipPath>
          <linearGradient id="srGrad_${uid}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#6d28d9"/>
          </linearGradient>
        </defs>
        <circle class="sr-track" cx="100" cy="100" r="86"/>
        <g clip-path="url(#srClip_${uid})">
          <g class="sr-fluid-level" id="srWaveWrap_${uid}" style="transform:translateY(210px)">
            <path class="sr-fluid-wave sr-fluid-wave-back" fill="url(#srGrad_${uid})" opacity=".55"
              d="M-260,208 C-230,196 -210,196 -180,208 C-150,220 -130,220 -100,208 C-70,196 -50,196 -20,208 C10,220 30,220 60,208 C90,196 110,196 140,208 C170,220 190,220 220,208 C250,196 270,196 300,208 C330,220 350,220 380,208 L380,420 L-260,420 Z"/>
            <path class="sr-fluid-wave sr-fluid-wave-front" fill="url(#srGrad_${uid})" opacity=".85"
              d="M-260,200 C-230,190 -210,190 -180,200 C-150,210 -130,210 -100,200 C-70,190 -50,190 -20,200 C10,210 30,210 60,200 C90,190 110,190 140,200 C170,210 190,210 220,200 C250,190 270,190 300,200 C330,210 350,210 380,200 L380,420 L-260,420 Z"/>
          </g>
        </g>
        <circle class="sr-progress" id="srProgress_${uid}" cx="100" cy="100" r="86"
          stroke-dasharray="${SR_CIRC}" stroke-dashoffset="${SR_CIRC}" stroke="url(#srGrad_${uid})"/>
      </svg>
      <div class="sr-time" id="srTime_${uid}">00:00:00</div>
      <div class="sr-phase-label" id="srPhase_${uid}"></div>
      <div class="sr-complete-overlay" id="srComplete_${uid}">✓<div>Session complete!</div></div>
    </div>
    <div class="sr-controls">
      <button class="sr-btn sr-start ${t.running ? 'running' : ''}" id="srStartBtn_${uid}" onclick="toggleStudyRun('${uid}')">${t.running ? 'Pause' : 'Start'}</button>
      <button class="sr-btn sr-skip" id="srSkipBtn_${uid}" onclick="skipPomoPhase('${uid}')" style="${t.mode === 'pomodoro' ? '' : 'display:none'}">Skip</button>
      <button class="sr-btn sr-reset" onclick="resetStudyTimer('${uid}')">Reset</button>
      <button class="sr-btn sr-remove" onclick="removeStudyUser('${uid}')">✕</button>
    </div>
  </div>`;
}

function setStudyMode(uid, mode) {
  const t = studyActive[uid];
  if (!t || t.running) return; // must pause first
  t.mode = mode;
  t.elapsed = 0; t.flushedSec = 0;
  if (mode === 'pomodoro') { t.pomoPhase = 'work'; t.pomoCount = 0; t.remaining = t.pomoWorkMin * 60; }
  else t.remaining = t.durationSec;
  renderStudyRings();
}

function setStudyDuration(uid, mins) {
  const t = studyActive[uid];
  if (!t) return;
  const m = Math.max(1, Math.min(300, parseInt(mins) || 25));
  if (t.mode === 'pomodoro') { t.pomoWorkMin = m; t.remaining = m * 60; }
  else { t.durationSec = m * 60; t.remaining = m * 60; }
  updateRingVisual(uid);
}

function toggleStudyRun(uid) {
  const t = studyActive[uid];
  if (!t) return;
  if (t.running) {
    t.running = false;
    clearInterval(t.intervalId); t.intervalId = null;
    if (t.mode !== 'pomodoro' || t.pomoPhase === 'work') flushStudyTime(uid);
  } else {
    if (t.mode === 'timer' && t.remaining <= 0) t.remaining = t.durationSec;
    if (t.mode === 'pomodoro' && t.remaining <= 0) {
      const phaseDur = t.pomoPhase === 'work' ? t.pomoWorkMin * 60 : (t.pomoPhase === 'longbreak' ? t.pomoLongBreakMin * 60 : t.pomoBreakMin * 60);
      t.remaining = phaseDur;
    }
    t.running = true;
    t.intervalId = setInterval(() => studyTick(uid), 1000);
  }
  renderStudyRings();
}

function skipPomoPhase(uid) {
  const t = studyActive[uid];
  if (!t || t.mode !== 'pomodoro') return;
  t.remaining = 0;
  completePomoPhase(uid);
}

function studyTick(uid) {
  const t = studyActive[uid];
  if (!t || !t.running) return;
  t.elapsed += 1;
  if (t.mode === 'timer') {
    t.remaining -= 1;
    if (t.remaining <= 0) { t.remaining = 0; completeStudyTimer(uid); return; }
  } else if (t.mode === 'pomodoro') {
    t.remaining -= 1;
    if (t.remaining <= 0) { t.remaining = 0; completePomoPhase(uid); return; }
  }
  updateRingVisual(uid);
}

function completePomoPhase(uid) {
  const t = studyActive[uid];
  if (!t) return;
  if (t.intervalId) clearInterval(t.intervalId);
  t.intervalId = null; t.running = false;
  const name = state.users[uid]?.name || 'Someone';
  if (t.pomoPhase === 'work') {
    flushStudyTime(uid);
    t.pomoCount++;
    const isLong = t.pomoCount % t.pomoCyclesBeforeLong === 0;
    t.pomoPhase = isLong ? 'longbreak' : 'break';
    const mins = isLong ? t.pomoLongBreakMin : t.pomoBreakMin;
    t.remaining = mins * 60; t.elapsed = 0; t.flushedSec = 0;
    flashPomo(`${name} — ${isLong ? 'Long break' : 'Break'} time! (${mins} min)`, 'break');
  } else {
    t.pomoPhase = 'work';
    t.remaining = t.pomoWorkMin * 60; t.elapsed = 0; t.flushedSec = 0;
    flashPomo(`${name} — back to work!`, 'work');
  }
  t.running = true;
  t.intervalId = setInterval(() => studyTick(uid), 1000);
  renderStudyRings();
}

let pomoFlashTimeout = null;
function flashPomo(text, kind) {
  let el = document.getElementById('pomoFlashOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'pomoFlashOverlay';
    el.className = 'pomo-flash';
    document.body.appendChild(el);
  }
  el.textContent = (kind === 'break' ? '☕ ' : '🍅 ') + text;
  el.classList.remove('work-flash', 'break-flash');
  el.classList.add(kind === 'break' ? 'break-flash' : 'work-flash');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(pomoFlashTimeout);
  pomoFlashTimeout = setTimeout(() => el.classList.remove('show'), 2600);
}

function completeStudyTimer(uid) {
  const t = studyActive[uid];
  clearInterval(t.intervalId); t.intervalId = null;
  t.running = false;
  flushStudyTime(uid);
  updateRingVisual(uid);
  const btn = document.getElementById('srStartBtn_' + uid);
  if (btn) { btn.textContent = 'Start'; btn.classList.remove('running'); }
  const overlay = document.getElementById('srComplete_' + uid);
  if (overlay) { overlay.classList.remove('show'); void overlay.offsetWidth; overlay.classList.add('show'); setTimeout(() => overlay.classList.remove('show'), 2200); }
  t.elapsed = 0; t.remaining = t.durationSec;
  setTimeout(() => updateRingVisual(uid), 2200);
}

function resetStudyTimer(uid) {
  const t = studyActive[uid];
  if (!t) return;
  if (t.intervalId) clearInterval(t.intervalId);
  if (t.mode !== 'pomodoro' || t.pomoPhase === 'work') flushStudyTime(uid);
  t.running = false; t.intervalId = null;
  t.elapsed = 0; t.flushedSec = 0;
  if (t.mode === 'pomodoro') { t.pomoPhase = 'work'; t.pomoCount = 0; t.remaining = t.pomoWorkMin * 60; }
  else t.remaining = t.durationSec;
  renderStudyRings();
}

/* Save the newly-studied seconds (since the last flush) to Firebase. */
function flushStudyTime(uid) {
  const t = studyActive[uid];
  if (!t) return;
  const delta = t.elapsed - t.flushedSec;
  t.flushedSec = t.elapsed;
  if (delta <= 0) return;
  const dt = todayStr();
  const cur = ((state.study.logs[dt] || {})[uid]) || 0;
  const next = cur + delta;
  state.study.logs[dt] = state.study.logs[dt] || {};
  state.study.logs[dt][uid] = next; // optimistic
  doWrite(() => fbPut('/study/logs/' + dt + '/' + uid, next)).then(() => renderStudyStats());
}

function updateRingVisual(uid) {
  const t = studyActive[uid];
  if (!t) return;
  const timeEl = document.getElementById('srTime_' + uid);
  const progEl = document.getElementById('srProgress_' + uid);
  const waveWrap = document.getElementById('srWaveWrap_' + uid);
  const phaseEl = document.getElementById('srPhase_' + uid);
  if (!timeEl || !progEl) return;
  let pct, displaySec;
  if (t.mode === 'timer') {
    displaySec = t.remaining;
    pct = t.durationSec ? t.remaining / t.durationSec : 0; // drains
  } else if (t.mode === 'pomodoro') {
    displaySec = t.remaining;
    const phaseDur = t.pomoPhase === 'work' ? t.pomoWorkMin * 60 : (t.pomoPhase === 'longbreak' ? t.pomoLongBreakMin * 60 : t.pomoBreakMin * 60);
    pct = phaseDur ? t.remaining / phaseDur : 0; // drains
  } else {
    displaySec = t.elapsed;
    pct = (t.elapsed % 3600) / 3600; // fills up, laps every hour
  }
  timeEl.textContent = fmtHMS(displaySec);
  progEl.style.strokeDashoffset = String(SR_CIRC * (1 - pct));
  if (waveWrap) {
    // native wave baseline sits at y≈200-210 (hidden below the r=86 clip circle, visible range y 14–186).
    // Move it up by up to ~215px so pct=1 fully covers the circle.
    const dy = 210 - (pct * 215);
    waveWrap.style.transform = `translateY(${dy}px)`;
  }
  if (phaseEl) {
    if (t.mode === 'pomodoro') {
      phaseEl.textContent = t.pomoPhase === 'work' ? `Work · #${t.pomoCount + 1}` : (t.pomoPhase === 'longbreak' ? 'Long break' : 'Break');
      phaseEl.style.display = 'block';
    } else phaseEl.style.display = 'none';
  }
}

/* ── Study calendar ── */
function studyCalNav(dir) {
  studyCalMonth += dir;
  if (studyCalMonth > 11) { studyCalMonth = 0; studyCalYear++; }
  if (studyCalMonth < 0) { studyCalMonth = 11; studyCalYear--; }
  renderStudyCal();
}

function studyDayTotalSec(ds) {
  const d = state.study.logs[ds] || {};
  return Object.values(d).reduce((s, v) => s + v, 0);
}

function renderStudyCal() {
  if (!studyCalYear) initStudyCal();
  const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('studyCalMonthLabel').textContent = MON[studyCalMonth] + ' ' + studyCalYear;
  const first = new Date(studyCalYear, studyCalMonth, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const dim = new Date(studyCalYear, studyCalMonth + 1, 0).getDate();
  const grid = document.getElementById('studyCalGrid');
  if (!grid) return;
  let html = ['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => `<div class="cal-hdr">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = studyCalYear + '-' + pad(studyCalMonth + 1) + '-' + pad(d);
    const sec = studyDayTotalSec(ds);
    const isToday = ds === todayStr();
    html += `<div class="cal-day ${sec ? 'has-data' : ''} ${isToday ? 'today' : ''}" onclick="selectStudyCalDay('${ds}')">
      <div class="cal-num">${d}</div>${sec ? `<div class="cal-tot">${Math.round(sec/60)}m</div>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
  if (studySelCalDate) renderStudyCalDetail(studySelCalDate);
}

function selectStudyCalDay(ds) {
  studySelCalDate = ds;
  renderStudyCalDetail(ds);
}

function renderStudyCalDetail(ds) {
  const box = document.getElementById('studyCalDetail');
  if (!box) return;
  const d = state.study.logs[ds] || {};
  const rows = userList().map(u => `<div class="subj-row"><div class="subj-lbl">${escHtml(u.name)}</div><div class="subj-cnt">${fmtHMS(d[u.id] || 0)}</div></div>`).join('');
  box.style.display = 'block';
  box.innerHTML = `<div class="section-label" style="margin:.6rem 0 .3rem">${dateLabel(ds)}</div>${rows || '<div class="no-subj-msg">No focus time logged.</div>'}`;
}

/* ── Study bar chart (last 7 days, grouped by person) ── */
let studyChart = null;
function renderStudyStats() {
  renderStudyCal();
  renderStudyChart();
}
function renderStudyChart() {
  const canvas = document.getElementById('studyChart');
  const msg = document.getElementById('studyNoDataMsg');
  if (!canvas) return;
  const users = userList();
  const totalAll = Object.values(state.study.logs || {}).reduce((s, day) => s + Object.values(day).reduce((a, b) => a + b, 0), 0);
  if (!users.length || !totalAll) {
    canvas.style.display = 'none'; if (msg) msg.style.display = 'block';
    if (studyChart) { studyChart.destroy(); studyChart = null; }
    return;
  }
  canvas.style.display = 'block'; if (msg) msg.style.display = 'none';
  const now = logicalNow();
  const keys = [], labels = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    keys.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    labels.push(dayNames[d.getDay()] + ' ' + d.getDate());
  }
  const datasets = users.map((u, i) => ({
    label: u.name,
    data: keys.map(k => Math.round(((state.study.logs[k] || {})[u.id] || 0) / 60)), // minutes
    backgroundColor: userColor(i), borderRadius: 3, borderSkipped: false,
    barPercentage: 0.9, categoryPercentage: 0.7
  }));
  document.getElementById('studyLegend').innerHTML = users.map((u, i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${userColor(i)}"></div>${escHtml(u.name)}</div>`).join('');
  if (studyChart) { studyChart.destroy(); studyChart = null; }
  studyChart = buildChart('studyChart', labels, datasets, keys.indexOf(todayStr()), false);
}

