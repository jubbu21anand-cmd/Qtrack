/* ════════════════════════════════════════════════════════════
   EXAM ANALYTICS
════════════════════════════════════════════════════════════ */
let examMode = 'jee';           // 'jee' | 'neet' | 'boards' | 'other'
let examUid = null;             // which person's exam data is being viewed
let examSelTestId = null;
let examDraftSubjects = [];
let examDraftDifficulty = null;
let examDraftJmJa = null;       // 'JM' | 'JA' | null — now user-chosen, not auto-detected
let examDraftAnalysis = {};     // { subjectName: { unitName: { attempted, scored } } }
let examEditingId = null;
let examPendingUid = null;      // uid awaiting password entry
let examPassEnterMode = 'primary'; // 'primary' | 'compare' — which flow the password modal is serving
let examWebSubj = null;         // subject picked for the attempted-vs-scored web chart
let examDraftReviews = {};      // { subjectName: 'free text review' }
let examAnalysisStandalone = false; // true when Analysis modal opened directly from a test card, not via full edit
let examCompareUid = null;      // person being compared against
let examCompareOpen = false;    // whether the Compare panel is expanded
let examComparePendingUid = null; // uid awaiting password entry, for Compare specifically
const LOCK_SVG = (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const EXAM_MODES = [
  { id: 'jee', label: 'JEE' },
  { id: 'neet', label: 'NEET' },
  { id: 'boards', label: 'Boards' },
  { id: 'other', label: 'Other' }
];
const EXAM_SUBJ_COLOR = { physics: '#5b8dee', chemistry: '#22c55e', maths: '#f5c842', biology: '#b06aed' };

/* Percentile = ((N - R) / N) × 100, where N = total candidates, R = rank */
function examCalcPercentile(rank, totalStudents) {
  const N = Number(totalStudents), R = Number(rank);
  if (!N || N <= 0 || !R || R <= 0) return null;
  const pct = ((N - R) / N) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)) * 100) / 100;
}

/* Colour for the main score circle: normalised onto a 0–300 scale.
   ≤100 red (redder toward 0) · 100–180 shades of yellow (lighter as it rises) · 180–300 greener as it rises */
function examScoreColor(score, max) {
  const norm = max ? (Number(score) / Number(max)) * 300 : Number(score) || 0;
  const n = Math.max(0, Math.min(300, norm));
  let h, l;
  if (n <= 100) { h = 0; l = 28 + (n / 100) * 16; }
  else if (n <= 180) { const t = (n - 100) / 80; h = 45 + t * 10; l = 42 + t * 18; }
  else { const t = (n - 180) / 120; h = 68 + t * 52; l = 40 + t * 8; }
  return `hsl(${Math.round(h)},72%,${Math.round(l)}%)`;
}

/* Colour for a per-subject circle, normalised onto a 0–100 scale.
   Physics & Chemistry: <40 red (redder toward 0) · 40–69 yellow · ≥70 green (greener as it rises)
   Maths: ≤15 red (redder toward 0) · 15–30 yellow · >30 green (greener toward 100) */
function examSubjScoreColor(fam, score, max) {
  const norm = max ? (Number(score) / Number(max)) * 100 : Number(score) || 0;
  const n = Math.max(0, Math.min(100, norm));
  let h, l;
  if (fam === 'maths') {
    if (n <= 15) { h = 0; l = 28 + (n / 15) * 10; }
    else if (n <= 30) { const t = (n - 15) / 15; h = 45 + t * 8; l = 40 + t * 15; }
    else { const t = (n - 30) / 70; h = 68 + t * 52; l = 40 + t * 8; }
  } else {
    if (n < 40) { h = 0; l = 28 + (n / 40) * 14; }
    else if (n < 70) { const t = (n - 40) / 30; h = 45 + t * 8; l = 40 + t * 18; }
    else { const t = Math.min(1, (n - 70) / 30); h = 68 + t * 52; l = 40 + t * 8; }
  }
  return `hsl(${Math.round(h)},72%,${Math.round(l)}%)`;
}

/* JM = JEE Main mock, JA = JEE Advanced mock — chosen by the user in the Add/Edit Test form, not auto-detected */
function examJmJa(t) { return (t.mode || 'jee') === 'jee' ? (t.jmja || null) : null; }

/* For JEE Advanced (JA) papers only, the main score circle's colour is driven by the test's
   percentile instead of the usual obtained/total grading:
     0 – 60     → red band:    deep red at 0, progressively lighter to light red at 60
     60.1 – 75  → yellow band: dark orangish-yellow at 60.1, progressively lighter to light yellow at 75
     75.1 – 100 → green band:  light green at 75.1, progressively deeper to dark green at 100
   The JM/JA badge itself keeps its original fixed colour — only the circle changes, and only for JA.
   Returns null when there's no percentile to grade on, in which case the caller falls back to the
   normal obtained/total colour grading. */
function examJaPercentileColor(pct) {
  if (pct == null || isNaN(pct)) return null;
  pct = Math.max(0, Math.min(100, pct));
  let h, s, l;
  if (pct <= 60) {
    h = 0; s = 75;
    l = 30 + (pct / 60) * 45; // 30% (deep) at 0 → 75% (light) at 60
  } else if (pct <= 75) {
    const t = (pct - 60) / 15;
    h = 38 + t * 14; s = 80;
    l = 42 + t * 36; // dark orangish-yellow → light yellow
  } else {
    const t = (pct - 75) / 25;
    h = 120; s = 55;
    l = 68 - t * 43; // light green → dark green
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return String(h);
}
/* Exam Analytics locks are re-checked every single time — there is deliberately NO persistence
   (no localStorage, no "remember me") for an unlocked state. examAuthedUid/examAuthedCompareUid
   are plain in-memory variables: a page refresh wipes them automatically, and switching to a
   different person or leaving the Exam Analytics page resets them on purpose, so the password
   must be re-entered every single time a locked person's data is viewed. */
let examAuthedUid = null;
let examAuthedCompareUid = null;

/* ── Extra hardening on top of the always-re-check gate above ──
   1) Switching away from the browser tab/app (visibilitychange) or losing window focus
      (blur) drops any current exam auth immediately — "anything" causes a re-lock, not
      just an in-app navigation. This closes the gap where someone leaves the Exam
      Analytics tab open, unlocked, and steps away from the device.
   2) A simple per-person attempt throttle discourages sitting there guessing a friend's
      password over and over — five wrong tries locks further attempts out for 20s. */
const examAttemptState = {}; // uid -> { fails, lockedUntil }
function initExamLockHardening() {
  const relock = () => {
    if (!examAuthedUid && !examAuthedCompareUid) return;
    examAuthedUid = null; examAuthedCompareUid = null;
    const examPage = document.getElementById('examPage');
    if (examPage && examPage.classList.contains('active')) renderExamPage();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) relock(); });
  window.addEventListener('blur', relock);
  window.addEventListener('pagehide', relock);
}
function examCanAttempt(uid) {
  const st = examAttemptState[uid];
  if (st && st.lockedUntil && Date.now() < st.lockedUntil) {
    const secs = Math.ceil((st.lockedUntil - Date.now()) / 1000);
    showToast(`Too many attempts — wait ${secs}s`);
    return false;
  }
  return true;
}
function examRecordAttempt(uid, success) {
  if (success) { delete examAttemptState[uid]; return; }
  const st = examAttemptState[uid] || { fails: 0, lockedUntil: 0 };
  st.fails++;
  if (st.fails >= 5) { st.lockedUntil = Date.now() + 20000; st.fails = 0; }
  examAttemptState[uid] = st;
}

function examSubjFamily(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('phy')) return 'physics';
  if (n.includes('chem')) return 'chemistry';
  if (n.includes('math')) return 'maths';
  if (n.includes('bio')) return 'biology';
  return null;
}

function examTestsForMode() {
  return Object.values(state.exams.tests)
    .filter(t => (t.mode || 'jee') === examMode && t.ownerUid === examUid)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function renderExamPage() {
  const users = userList();
  if (!users.length) {
    document.getElementById('examChipRow').innerHTML = '<div class="exam-empty" style="padding:.4rem">Add a person on the Question Tracker page first.</div>';
    document.getElementById('examModeToggle').innerHTML = '';
    document.getElementById('examOverviewStrip').innerHTML = '';
    document.getElementById('examTestsGrid').innerHTML = '';
    return;
  }
  if (!examUid || !state.users[examUid]) examUid = users[0].id;
  renderExamChips();
  renderExamModeToggle();

  // Hard gate: a locked person's data is never rendered unless they are authenticated THIS instant
  // (examAuthedUid must exactly match examUid — see note above the variable declaration).
  const locked = state.exams.locks[examUid];
  const content = document.getElementById('examContent');
  const lockedScreen = document.getElementById('examLockedScreen');
  if (locked && examAuthedUid !== examUid) {
    if (content) content.style.display = 'none';
    if (lockedScreen) {
      lockedScreen.style.display = 'block';
      lockedScreen.innerHTML = `
        <div style="margin-bottom:.6rem;color:var(--ex-muted)">${LOCK_SVG(34)}</div>
        <div style="font-weight:700;margin-bottom:.3rem">${escHtml(state.users[examUid]?.name || 'This person')}'s Exam Analytics is locked</div>
        <div style="font-size:.72rem;color:var(--ex-muted);margin-bottom:1rem">Enter the password to view it. You'll need to enter it again next time — on refresh, on switching users, or on leaving this page.</div>
        <button class="btn-confirm" style="max-width:220px;margin:0 auto" onclick="examPromptUnlockCurrent()">Enter password</button>`;
    }
    return;
  }
  if (content) content.style.display = '';
  if (lockedScreen) lockedScreen.style.display = 'none';

  const tests = examTestsForMode();
  renderExamOverview(tests);
  renderExamTestsGrid(tests);
  renderExamCharts(tests); // always visible now — no toggle
  renderExamExtra(tests);
  const cbtn = document.getElementById('examCompareToggleBtn');
  const cblock = document.getElementById('examCompareBlock');
  if (cbtn) cbtn.classList.toggle('active', examCompareOpen);
  if (cblock) cblock.style.display = examCompareOpen ? 'block' : 'none';
  if (examCompareOpen) renderExamCompare();
}

function examPromptUnlockCurrent() {
  examPendingUid = examUid;
  examPassEnterMode = 'primary';
  document.getElementById('examPassEnterHint').textContent = `${state.users[examUid]?.name || 'This person'} has locked their Exam Analytics. Enter their password to view it.`;
  document.getElementById('examPassEnterInput').value = '';
  openModal('examPassEnterModal');
}
function examPromptUnlockCompare() {
  examPendingUid = examCompareUid;
  examPassEnterMode = 'compare';
  document.getElementById('examPassEnterHint').textContent = `${state.users[examCompareUid]?.name || 'This person'} has locked their Exam Analytics. Enter their password to compare against them.`;
  document.getElementById('examPassEnterInput').value = '';
  openModal('examPassEnterModal');
}

function toggleExamCompare() {
  examCompareOpen = !examCompareOpen;
  renderExamPage();
}

/* Compare against another person — password-gated if they've locked their Exam Analytics.
   Re-checked on every switch: examAuthedCompareUid is cleared whenever the compare target changes,
   so picking someone else and picking them back again still demands the password again. */
function examSelectCompareUser(uid) {
  if (uid === examCompareUid) return;
  examAuthedCompareUid = null;
  const locked = state.exams.locks[uid];
  if (locked) {
    examPendingUid = uid;
    examPassEnterMode = 'compare';
    document.getElementById('examPassEnterHint').textContent = `${state.users[uid]?.name || 'This person'} has locked their Exam Analytics. Enter their password to compare against them.`;
    document.getElementById('examPassEnterInput').value = '';
    openModal('examPassEnterModal');
    return;
  }
  examCompareUid = uid;
  renderExamPage();
}

let examCompareTestsChart = null, examComparePerfChart = null;
function renderExamCompare() {
  const chipHost = document.getElementById('examCompareChipRow');
  const resultHost = document.getElementById('examCompareResult');
  if (!chipHost || !resultHost) return;
  const others = userList().filter(u => u.id !== examUid);
  if (!others.length) { chipHost.innerHTML = '<div class="exam-empty">No one else to compare against yet.</div>'; resultHost.innerHTML = ''; return; }
  if (!examCompareUid || examCompareUid === examUid || !others.find(u => u.id === examCompareUid)) examCompareUid = others[0].id;
  chipHost.innerHTML = others.map(u => {
    const locked = !!state.exams.locks[u.id];
    return `<button class="exam-chip ${u.id === examCompareUid ? 'active' : ''} ${locked ? 'locked-chip' : ''}" onclick="examSelectCompareUser('${u.id}')">${escHtml(u.name)}</button>`;
  }).join('');

  // Same hard gate as the primary view: a locked compare target's data never renders without fresh auth.
  const compareLocked = state.exams.locks[examCompareUid];
  if (compareLocked && examAuthedCompareUid !== examCompareUid) {
    resultHost.innerHTML = `<div class="exam-empty" style="text-align:center;padding:1.4rem 1rem">${LOCK_SVG(15)} ${escHtml(state.users[examCompareUid]?.name || 'This person')}'s data is locked.
      <br><button class="exam-icon-btn" style="margin-top:.6rem" onclick="examPromptUnlockCompare()">Enter password</button></div>`;
    if (examCompareTestsChart) { examCompareTestsChart.destroy(); examCompareTestsChart = null; }
    if (examComparePerfChart) { examComparePerfChart.destroy(); examComparePerfChart = null; }
    return;
  }

  const meTests = examTestsForMode();
  const themTests = Object.values(state.exams.tests).filter(t => (t.mode || 'jee') === examMode && t.ownerUid === examCompareUid).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const pctFn = t => t.totalMarks ? (t.obtainedMarks / t.totalMarks) * 100 : 0;
  const meName = state.users[examUid]?.name || 'You';
  const themName = state.users[examCompareUid]?.name || 'Them';

  if (!meTests.length && !themTests.length) {
    resultHost.innerHTML = '<div class="exam-empty">Neither of you has logged a test in this mode yet.</div>';
    if (examCompareTestsChart) { examCompareTestsChart.destroy(); examCompareTestsChart = null; }
    if (examComparePerfChart) { examComparePerfChart.destroy(); examComparePerfChart = null; }
    return;
  }

  const meAvg = meTests.length ? Math.round((meTests.reduce((s, t) => s + pctFn(t), 0) / meTests.length) * 10) / 10 : 0;
  const themAvg = themTests.length ? Math.round((themTests.reduce((s, t) => s + pctFn(t), 0) / themTests.length) * 10) / 10 : 0;
  let leadHTML;
  if (meAvg === themAvg) leadHTML = `<div class="exam-compare-lead-name">It's a tie</div>`;
  else { const leader = meAvg > themAvg ? meName : themName; leadHTML = `<div class="exam-compare-lead-name">${escHtml(leader)} is leading</div>`; }

  resultHost.innerHTML = `
    <div class="exam-compare-lead">
      ${leadHTML}
      <div class="exam-compare-avgs">
        <div class="exam-compare-avg-item"><div class="exam-compare-avg-name">${escHtml(meName)}</div><div class="exam-compare-avg-val">${meAvg}%</div></div>
        <div class="exam-compare-avg-item"><div class="exam-compare-avg-name">${escHtml(themName)}</div><div class="exam-compare-avg-val">${themAvg}%</div></div>
      </div>
    </div>
    <div class="exam-section-title">Tests attempted over time</div>
    <div class="chart-wrap" style="height:180px;"><canvas id="examCompareTestsChart"></canvas></div>
    <div class="exam-section-title" style="margin-top:.8rem">Performance comparison</div>
    <div class="chart-wrap" style="height:190px;"><canvas id="examComparePerfChart"></canvas></div>`;

  // union of dates, sorted, drives both charts
  const dateSet = new Set([...meTests.map(t => t.date), ...themTests.map(t => t.date)].filter(Boolean));
  const dates = [...dateSet].sort();
  const meByDate = {}; meTests.forEach(t => { meByDate[t.date] = t; });
  const themByDate = {}; themTests.forEach(t => { themByDate[t.date] = t; });

  let cumMe = 0, cumThem = 0;
  const cumMeData = dates.map(d => { if (meByDate[d]) cumMe++; return cumMe; });
  const cumThemData = dates.map(d => { if (themByDate[d]) cumThem++; return cumThem; });

  if (examCompareTestsChart) examCompareTestsChart.destroy();
  const tc = '#7fae8f', gc = 'rgba(34,197,94,0.1)';
  examCompareTestsChart = new Chart(document.getElementById('examCompareTestsChart'), {
    type: 'line',
    data: {
      labels: dates.map(d => dateLabel(d)),
      datasets: [
        { label: meName, data: cumMeData, borderColor: '#22c55e', backgroundColor: hexAlpha('#22c55e', .14), borderWidth: 2, pointRadius: 2, tension: .25, fill: true },
        { label: themName, data: cumThemData, borderColor: '#e84a8a', backgroundColor: hexAlpha('#e84a8a', .14), borderWidth: 2, pointRadius: 2, tension: .25, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 } }, beginAtZero: true } }
    }
  });

  if (examComparePerfChart) examComparePerfChart.destroy();
  examComparePerfChart = new Chart(document.getElementById('examComparePerfChart'), {
    type: 'line',
    data: {
      labels: dates.map(d => dateLabel(d)),
      datasets: [
        { label: meName, data: dates.map(d => meByDate[d] ? Math.round(pctFn(meByDate[d]) * 10) / 10 : null), borderColor: '#22c55e', backgroundColor: hexAlpha('#22c55e', .14), borderWidth: 2, pointRadius: 3, tension: .25, fill: false, spanGaps: true },
        { label: themName, data: dates.map(d => themByDate[d] ? Math.round(pctFn(themByDate[d]) * 10) / 10 : null), borderColor: '#e84a8a', backgroundColor: hexAlpha('#e84a8a', .14), borderWidth: 2, pointRadius: 3, tension: .25, fill: false, spanGaps: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, callback: v => v + '%' }, beginAtZero: true, max: 100 } }
    }
  });
}

/* Avg performance, top score and lowest score across every test in this mode — small rectangular tabs */
function renderExamOverview(tests) {
  const host = document.getElementById('examOverviewStrip');
  if (!host) return;
  if (!tests.length) {
    host.innerHTML = `
      <div class="exam-overview-tab ex-c1"><div class="exam-overview-tab-label">Avg</div><div class="exam-overview-tab-value">—</div></div>
      <div class="exam-overview-tab ex-c3"><div class="exam-overview-tab-label">Top</div><div class="exam-overview-tab-value">—</div></div>
      <div class="exam-overview-tab ex-c4"><div class="exam-overview-tab-label">Lowest</div><div class="exam-overview-tab-value">—</div></div>`;
    return;
  }
  let sumPct = 0, top = null, low = null;
  tests.forEach(t => {
    const pct = t.totalMarks ? (t.obtainedMarks / t.totalMarks) * 100 : 0;
    sumPct += pct;
    if (!top || pct > top.pct) top = { pct, t };
    if (!low || pct < low.pct) low = { pct, t };
  });
  const avg = Math.round((sumPct / tests.length) * 10) / 10;
  host.innerHTML = `
    <div class="exam-overview-tab ex-c1">
      <div class="exam-overview-tab-label">Avg Performance</div>
      <div class="exam-overview-tab-value">${avg}%</div>
      <div class="exam-overview-tab-sub">across ${tests.length} test${tests.length === 1 ? '' : 's'}</div>
    </div>
    <div class="exam-overview-tab ex-c3">
      <div class="exam-overview-tab-label">Top Score</div>
      <div class="exam-overview-tab-value">${Math.round(top.pct * 10) / 10}%</div>
      <div class="exam-overview-tab-sub"><b>${escHtml(top.t.name)}</b> · ${top.t.date ? dateLabel(top.t.date) : ''}</div>
    </div>
    <div class="exam-overview-tab ex-c4">
      <div class="exam-overview-tab-label">Lowest Score</div>
      <div class="exam-overview-tab-value">${Math.round(low.pct * 10) / 10}%</div>
      <div class="exam-overview-tab-sub"><b>${escHtml(low.t.name)}</b> · ${low.t.date ? dateLabel(low.t.date) : ''}</div>
    </div>`;
}

/* Which subject circles to show on a test card.
   JEE / NEET are fixed, well-known subject sets, so they keep their dedicated family colour scales.
   Boards / Other have no fixed subject set, so every subject the user actually added on that test is shown. */
function examCirclesForTest(t) {
  const bySubj = {};
  (t.subjects || []).forEach(s => { const f = examSubjFamily(s.name); if (f) bySubj[f] = s; });
  if (examMode === 'jee' || examMode === 'neet') {
    const famOrder = examMode === 'jee'
      ? [['physics', 'PHY'], ['chemistry', 'CHEM'], ['maths', 'MATHS']]
      : [['physics', 'PHY'], ['chemistry', 'CHEM'], ['biology', 'BIO']];
    return famOrder.map(([fam, lbl]) => {
      const s = bySubj[fam];
      return { label: lbl, score: s ? s.score : null, color: s ? examSubjScoreColor(fam, s.score, s.max || 100) : 'var(--ex-surface2)' };
    });
  }
  return (t.subjects || []).map(s => ({
    label: (s.name || '').toUpperCase(),
    score: s.score,
    color: examSubjScoreColor(examSubjFamily(s.name), s.score, s.max || 100)
  }));
}

/* Grid of larger, colour-graded test cards — main score circle on the left, subject circles to the right */
function renderExamTestsGrid(tests) {
  const host = document.getElementById('examTestsGrid');
  if (!host) return;
  if (!tests.length) { host.innerHTML = '<div class="exam-empty">No tests logged in this mode yet. Tap <strong>+ Add Test</strong> to log your first one.</div>'; return; }
  const isOther = examMode === 'other';
  host.innerHTML = [...tests].reverse().map(t => {
    const badge = examJmJa(t);
    const percentile = t.overallPercentile != null ? t.overallPercentile : examCalcPercentile(t.overallRank, t.totalStudents);
    // The main score circle's colour grading is percentile-based ONLY for JEE Advanced papers — every
    // other test (including JEE Main) keeps the plain obtained/total colour grading as before.
    const jaCol = badge && badge.toLowerCase() === 'ja' ? examJaPercentileColor(percentile) : null;
    const circleColor = jaCol || examScoreColor(t.obtainedMarks, t.totalMarks || 1);
    const circles = examCirclesForTest(t);
    const pct = t.totalMarks ? Math.round((t.obtainedMarks / t.totalMarks) * 1000) / 10 : 0;
    return `
    <div class="exam-test-card">
      <div class="exam-test-card-top">
        <div>
          <div class="exam-test-card-name">${escHtml(t.name)}</div>
          <div class="exam-test-card-date">${t.date ? dateLabel(t.date) : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:.35rem">
          ${t.difficulty ? `<span class="exam-diff-badge ${t.difficulty}">${t.difficulty}</span>` : ''}
          ${badge ? `<span class="exam-jmja-badge ${badge.toLowerCase()}">${badge}</span>` : ''}
          ${t.bdData ? `<button class="exam-an-btn has" onclick="openExamSummary('${t.id}')" title="Open the full analysis of this test">Analysis</button>` : `<button class="exam-an-btn" disabled title="Available for tests saved from Paper In-Depth Breakdown">Analysis</button>`}
        </div>
      </div>
      <div class="exam-score-row">
        <div class="exam-score-circle main" style="background:${circleColor}${jaCol ? ';color:#15110c' : ''}">${t.obtainedMarks ?? 0}<br><span style="font-size:.8em">/${t.totalMarks ?? 0}</span></div>
        <div class="exam-subj-circles">
          ${circles.map(c => `<div class="exam-subj-circle-wrap">
              <div class="exam-subj-circle" style="background:${c.color}">${c.score ?? '—'}</div>
              <div class="exam-subj-circle-name">${escHtml(c.label)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="exam-test-stats">
        ${isOther ? `
        <div>Percentage: <b>${t.totalMarks ? pct + '%' : '—'}</b></div>
        <div>Total Marks: <b>${t.totalMarks ?? '—'}</b></div>` : `
        <div>Rank: <b>${t.overallRank ?? '—'}</b> of <b>${t.totalStudents ?? '—'}</b> candidates</div>
        <div>Percentile: <b>${percentile != null ? (t.pctEstimated ? '≈ ' : '') + percentile + '%' : '—'}</b>${t.pctEstimated && percentile != null ? ' <span style="font-size:.62em;opacity:.7" title="Estimated from your marks (Paper In-Depth Breakdown)">est.</span>' : ''}</div>`}
      </div>
      ${t.note ? `<div class="exam-note-box" style="font-size:.62rem;padding:.4rem .5rem">${escHtml(t.note)}</div>` : ''}
      <div class="exam-test-card-actions">
        <button class="exam-icon-btn" onclick="openExamModal('${t.id}')">Edit</button>
        ${isOther ? '' : `<button class="exam-icon-btn" onclick="openExamAnalysisFor('${t.id}')">Paper Breakdown</button>`}
        <button class="exam-icon-btn" onclick="deleteExamTest('${t.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function renderExamChips() {
  const host = document.getElementById('examChipRow');
  if (!host) return;
  const users = userList();
  host.innerHTML = users.map(u => {
    const locked = !!state.exams.locks[u.id];
    return `<button class="exam-chip ${u.id === examUid ? 'active' : ''} ${locked ? 'locked-chip' : ''}" onclick="selectExamUser('${u.id}')">${escHtml(u.name)}</button>`;
  }).join('') + `<button class="exam-settings-btn" onclick="openExamPassSet()" title="Lock/unlock ${escHtml(state.users[examUid]?.name || '')}'s data">⚙</button>`;
}

/* Selecting a locked person always re-prompts for the password — examAuthedUid is only ever
   set for the exact uid just authenticated, and switching away clears it (see below), so there is
   no way to "remember" an unlock across a switch. */
function selectExamUser(uid) {
  if (uid === examUid) return;
  examAuthedUid = null;
  const locked = state.exams.locks[uid];
  if (locked) {
    examPendingUid = uid;
    examPassEnterMode = 'primary';
    document.getElementById('examPassEnterHint').textContent = `${state.users[uid]?.name || 'This person'} has locked their Exam Analytics. Enter their password to view it.`;
    document.getElementById('examPassEnterInput').value = '';
    openModal('examPassEnterModal');
    return;
  }
  examUid = uid; examSelTestId = null; examWebSubj = null;
  renderExamPage();
}

function submitExamPasswordEnter() {
  if (!examCanAttempt(examPendingUid)) return;
  const pw = document.getElementById('examPassEnterInput').value;
  const locked = state.exams.locks[examPendingUid];
  const ok = locked && simpleHash(examPendingUid + ':' + pw) === locked.hash;
  examRecordAttempt(examPendingUid, ok);
  if (ok) {
    closeModal('examPassEnterModal');
    if (examPassEnterMode === 'compare') {
      examAuthedCompareUid = examPendingUid;
      examCompareUid = examPendingUid;
    } else {
      examAuthedUid = examPendingUid;
      examUid = examPendingUid; examSelTestId = null; examWebSubj = null;
    }
    renderExamPage();
  } else {
    showToast('Incorrect password');
  }
}

/* Changing/removing an existing lock requires being authenticated for it first — otherwise anyone
   could bypass a lock just by overwriting it with a password of their own choosing. */
function openExamPassSet() {
  const locked = state.exams.locks[examUid];
  if (locked && examAuthedUid !== examUid) {
    examPromptUnlockCurrent();
    showToast('Enter the current password first to change it');
    return;
  }
  document.getElementById('examPassSetName').textContent = state.users[examUid]?.name || '';
  document.getElementById('examPassSetInput').value = '';
  openModal('examPassSetModal');
}
function submitExamPasswordSet() {
  const pw = document.getElementById('examPassSetInput').value;
  closeModal('examPassSetModal');
  if (!pw) {
    doWrite(() => fbDelete('/exams/locks/' + examUid)).then(ok => { if (ok) showToast('Lock removed'); });
    return;
  }
  doWrite(() => fbPut('/exams/locks/' + examUid, { hash: simpleHash(examUid + ':' + pw) }))
    .then(ok => { if (ok) { examAuthedUid = examUid; showToast('Password set'); } });
}

function renderExamModeToggle() {
  const host = document.getElementById('examModeToggle');
  if (!host) return;
  host.innerHTML = EXAM_MODES.map(m =>
    `<button class="exam-mode-btn ${m.id === examMode ? 'active' : ''}" onclick="setExamMode('${m.id}')">${m.label}</button>`).join('');
}
function setExamMode(m) { examMode = m; examSelTestId = null; examWebSubj = null; renderExamPage(); }

function examAnalysisSummaryHTML(t) {
  if (!t.analysis) return '';
  const rows = [];
  Object.keys(t.analysis).forEach(subj => {
    const units = t.analysis[subj];
    const sorted = Object.keys(units).sort((a, b) => (units[b].attempted || 0) - (units[a].attempted || 0));
    if (!sorted.length) return;
    const most = sorted[0], least = sorted[sorted.length - 1];
    rows.push(`<div style="margin-bottom:.3rem"><strong>${escHtml(subj)}:</strong> most emphasized — ${escHtml(most)} (${units[most].attempted || 0} marks attempted) · least — ${escHtml(least)} (${units[least].attempted || 0} marks attempted)</div>`);
  });
  return rows.length ? `<div class="exam-note-box">🔍 <strong>Paper analysis</strong><br>${rows.join('')}</div>` : '';
}

function openExamModal(editId = null) {
  examEditingId = editId;
  const t = editId ? state.exams.tests[editId] : null;
  document.getElementById('examModalTitle').textContent = editId ? 'Edit Test' : 'Add Test';
  document.getElementById('examTestName').value = t ? t.name : '';
  document.getElementById('examTestDate').value = t ? t.date : todayStr();
  document.getElementById('examTestDate').max = todayStr();
  document.getElementById('examTotalMarks').value = t ? t.totalMarks ?? '' : '';
  document.getElementById('examObtMarks').value = t ? t.obtainedMarks ?? '' : '';
  document.getElementById('examOverallRank').value = t ? t.overallRank ?? '' : '';
  document.getElementById('examTotalStudents').value = t ? t.totalStudents ?? '' : '';
  document.getElementById('examNote').value = t ? t.note || '' : '';
  examDraftSubjects = t ? JSON.parse(JSON.stringify(t.subjects || [])) : state.subjects.map(s => ({ name: s.name, score: '', max: '' }));
  if (!examDraftSubjects.length) examDraftSubjects = [{ name: '', score: '', max: '' }];
  examDraftDifficulty = t ? t.difficulty || null : null;
  examDraftJmJa = t ? t.jmja || null : null;
  examDraftAnalysis = t ? JSON.parse(JSON.stringify(t.analysis || {})) : {};
  examDraftReviews = t ? JSON.parse(JSON.stringify(t.subjectReviews || {})) : {};
  examAnalysisStandalone = false;
  renderExamSubjRows();
  updateExamDiffPreview();
  updateExamPercentilePreview();
  document.getElementById('examJmJaField').style.display = examMode === 'jee' ? 'block' : 'none';
  updateExamJmJaButtons();
  openModal('examTestModal');
}

function setExamDraftJmJa(v) { examDraftJmJa = v; updateExamJmJaButtons(); }
function updateExamJmJaButtons() {
  document.querySelectorAll('[id^="examJmJaBtn_"]').forEach(b => b.classList.remove('selected'));
  document.getElementById('examJmJaBtn_' + (examDraftJmJa || '')).classList.add('selected');
}

function updateExamPercentilePreview() {
  const el = document.getElementById('examPercentilePreview');
  if (!el) return;
  const rank = document.getElementById('examOverallRank').value;
  const total = document.getElementById('examTotalStudents').value;
  const p = examCalcPercentile(rank, total);
  el.textContent = p != null ? `Calculated percentile: ${p}%` : 'Percentile is calculated automatically from rank and total candidates.';
}

function updateExamDiffPreview() {
  const el = document.getElementById('examDiffPreview');
  if (el) el.innerHTML = examDraftDifficulty ? `<span class="exam-diff-badge ${examDraftDifficulty}">${examDraftDifficulty}</span>` : '';
}

function renderExamSubjRows() {
  const host = document.getElementById('examSubjRows');
  if (!host) return;
  host.innerHTML = examDraftSubjects.map((r, i) => `
    <div class="exam-subj-row">
      <input type="text" placeholder="Subject" value="${escHtml(r.name || '')}" oninput="examDraftSubjects[${i}].name=this.value">
      <input type="number" placeholder="Score" value="${r.score ?? ''}" oninput="examDraftSubjects[${i}].score=this.value">
      <input type="number" placeholder="Max" value="${r.max ?? ''}" oninput="examDraftSubjects[${i}].max=this.value">
      <button class="exam-subj-row-del" onclick="removeExamSubjRow(${i})">✕</button>
    </div>`).join('');
}
function addExamSubjRow() { examDraftSubjects.push({ name: '', score: '', max: '' }); renderExamSubjRows(); }
function removeExamSubjRow(i) { examDraftSubjects.splice(i, 1); renderExamSubjRows(); }

function saveExamTest() {
  const name = document.getElementById('examTestName').value.trim();
  if (!name) { showToast('Enter a test name'); return; }
  const id = examEditingId || ('ex' + Date.now());
  const rank = document.getElementById('examOverallRank').value ? Number(document.getElementById('examOverallRank').value) : null;
  const totalStudents = document.getElementById('examTotalStudents').value ? Number(document.getElementById('examTotalStudents').value) : null;
  const prevT = examEditingId ? state.exams.tests[examEditingId] : null;
  const calcP = examCalcPercentile(rank, totalStudents);
  const keepP = calcP == null && prevT && prevT.overallPercentile != null;   // a percentile typed without a rank (e.g. saved from Paper Breakdown) must survive edits
  const test = {
    id, mode: examMode, name, ownerUid: examUid,
    date: document.getElementById('examTestDate').value || todayStr(),
    totalMarks: Number(document.getElementById('examTotalMarks').value) || 0,
    obtainedMarks: Number(document.getElementById('examObtMarks').value) || 0,
    overallRank: rank,
    totalStudents: totalStudents,
    overallPercentile: calcP != null ? calcP : (keepP ? prevT.overallPercentile : null),
    pctEstimated: calcP == null && keepP ? !!prevT.pctEstimated : false,
    ...(prevT && prevT.source ? { source: prevT.source } : {}),
    ...(prevT && prevT.bdData ? { bdData: prevT.bdData } : {}),
    note: document.getElementById('examNote').value.trim(),
    difficulty: examDraftDifficulty,
    jmja: examMode === 'jee' ? examDraftJmJa : null,
    analysis: examDraftAnalysis,
    subjectReviews: examDraftReviews,
    subjects: examDraftSubjects.filter(s => s.name && s.name.trim()).map(s => ({
      name: s.name.trim(), score: Number(s.score) || 0, max: Number(s.max) || 0
    }))
  };
  closeModal('examTestModal');
  doWrite(() => fbPut('/exams/tests/' + id, test)).then(ok => { if (ok) { examSelTestId = id; showToast('Test saved'); } });
}

function deleteExamTest(id) {
  if (!confirm('Delete this test entry?')) return;
  doWrite(() => fbDelete('/exams/tests/' + id)).then(ok => { if (ok) { examSelTestId = null; showToast('Deleted'); } });
}

/* ── Paper Analysis survey (opened from the Add/Edit Test modal, or directly from a test card) ── */
function openExamAnalysisModal() {
  document.querySelectorAll('.exam-diff-pick-btn').forEach(b => b.classList.remove('selected'));
  if (examDraftDifficulty) document.getElementById('examDiffBtn_' + examDraftDifficulty)?.classList.add('selected');
  renderExamAnalysisRows();
  openModal('examAnalysisModal');
}

/* Open the Analysis survey straight from a test card, without going through the full edit form —
   "analysis section can be accessed anytime at will" */
function openExamAnalysisFor(id) {
  const t = state.exams.tests[id];
  if (!t) return;
  examEditingId = id;
  examDraftSubjects = (t.subjects && t.subjects.length) ? JSON.parse(JSON.stringify(t.subjects)) : state.subjects.map(s => ({ name: s.name, score: '', max: '' }));
  examDraftDifficulty = t.difficulty || null;
  examDraftAnalysis = JSON.parse(JSON.stringify(t.analysis || {}));
  examDraftReviews = JSON.parse(JSON.stringify(t.subjectReviews || {}));
  examAnalysisStandalone = true;
  openExamAnalysisModal();
}

/* "Done" on the Analysis modal — if opened standalone (not via the full edit form), save the
   analysis/difficulty/reviews straight back onto the existing test instead of discarding them */
function closeExamAnalysisModal() {
  if (examAnalysisStandalone && examEditingId) {
    const t = state.exams.tests[examEditingId];
    if (t) {
      const updated = { ...t, difficulty: examDraftDifficulty, analysis: examDraftAnalysis, subjectReviews: examDraftReviews };
      doWrite(() => fbPut('/exams/tests/' + examEditingId, updated)).then(ok => { if (ok) showToast('Analysis saved'); });
    }
    examAnalysisStandalone = false;
  }
  closeModal('examAnalysisModal');
}
function setExamDraftDifficulty(d) {
  examDraftDifficulty = d;
  document.querySelectorAll('.exam-diff-pick-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('examDiffBtn_' + d)?.classList.add('selected');
  updateExamDiffPreview();
}
function renderExamAnalysisRows() {
  const host = document.getElementById('examAnalysisRows');
  if (!host) return;
  // "Other" mode has no fixed, known subject syllabus (unlike JEE/NEET), so the topic-wise breakdown
  // portal doesn't apply here — only the difficulty rating (rendered separately, above this host) is kept.
  if (examMode === 'other') { host.innerHTML = '<div class="exam-empty">Topic-wise breakdown isn\'t available in Other mode — just log the difficulty above.</div>'; return; }
  const subjects = examDraftSubjects.filter(s => s.name && s.name.trim());
  if (!subjects.length) { host.innerHTML = '<div class="exam-empty">Add subjects in the main form first.</div>'; return; }
  let html = '';
  subjects.forEach(s => {
    const fam = examSubjFamily(s.name);
    const units = fam ? BROAD_UNITS[fam] : null;
    if (!units) return;
    if (!examDraftAnalysis[s.name]) examDraftAnalysis[s.name] = {};
    html += `<div class="exam-analysis-subj"><div class="exam-analysis-subj-name">${escHtml(s.name)}</div>
      <div class="exam-analysis-hdr"><span>Topic</span><span>Attempted (marks)</span><span>Scored (marks)</span></div>
      ${units.map(u => {
        const v = examDraftAnalysis[s.name][u] || { attempted: '', scored: '' };
        return `<div class="exam-analysis-unit-row">
          <span class="exam-analysis-unit-name">${escHtml(u)}</span>
          <input type="number" min="0" value="${v.attempted}" placeholder="marks" oninput="setExamAnalysisVal('${escJs(s.name)}','${escJs(u)}','attempted',this.value)">
          <input type="number" min="0" value="${v.scored}" placeholder="marks" oninput="setExamAnalysisVal('${escJs(s.name)}','${escJs(u)}','scored',this.value)">
        </div>`;
      }).join('')}
      <div class="exam-review-box">
        <div class="exam-review-label">Your ${escHtml(s.name)} review</div>
        <textarea placeholder="What felt easy, what to revise, how you felt going in..." oninput="examDraftReviews['${escJs(s.name)}']=this.value">${escHtml(examDraftReviews[s.name] || '')}</textarea>
      </div>
    </div>`;
  });
  host.innerHTML = html || '<div class="exam-empty">Subject names don\'t match a known Physics/Chemistry/Maths/Biology family, so no topic breakdown is available.</div>';
}
function setExamAnalysisVal(subj, unit, field, val) {
  if (!examDraftAnalysis[subj]) examDraftAnalysis[subj] = {};
  if (!examDraftAnalysis[subj][unit]) examDraftAnalysis[subj][unit] = { attempted: '', scored: '' };
  examDraftAnalysis[subj][unit][field] = val === '' ? '' : Number(val);
}

function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* JEE Main and JEE Advanced are always plotted as separate coloured series — never merged into one line,
   and EVERY test keeps its own x-axis slot (one point per test, in date-sorted order) even when two tests
   share a calendar date — two JEE Advanced attempts on the same day must show as two distinct points, never
   silently collapsed into one. The flat day-to-day average (when several tests share a date) is a separate
   dotted "Day avg" line added alongside these datasets in renderExamCharts, not a merge of the points themselves. */
function examBuildJmJaDatasets(tests, valueFn, colorOther) {
  if (examMode !== 'jee') {
    return [{
      label: 'Score', data: tests.map(valueFn), borderColor: colorOther, backgroundColor: hexAlpha(colorOther, .18),
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: colorOther, tension: .3, fill: true, spanGaps: true
    }];
  }
  const colors = { JM: '#5b8dee', JA: '#e84a8a', Other: colorOther };
  const names = { JM: 'JEE Main', JA: 'JEE Advanced', Other: 'Other JEE' };
  const present = ['JM', 'JA', 'Other'].filter(g => tests.some(t => (examJmJa(t) || 'Other') === g));
  return present.map(g => ({
    label: names[g],
    data: tests.map(t => (examJmJa(t) || 'Other') === g ? valueFn(t) : null),
    borderColor: colors[g], backgroundColor: hexAlpha(colors[g], .16),
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: colors[g], tension: .3, fill: false, spanGaps: true
  }));
}

/* Dotted "average for that day" overlay — when several tests share a calendar date, every point on
   that date gets the same value: the mean of valueFn() across just that date's tests. Days with a single
   test just show that test's own value, so the line still tracks the overall trend day to day. */
function examDayAvgLine(tests, valueFn) {
  const byDate = {};
  tests.forEach((t, i) => { const d = t.date || ('_row' + i); (byDate[d] = byDate[d] || []).push(valueFn(t)); });
  return tests.map((t, i) => {
    const d = t.date || ('_row' + i);
    const vals = byDate[d].filter(v => v != null);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  });
}

/* Increase/decrease indicator comparing the latest test to the one before it */
function examTrendBadgeHTML(tests, valueFn, higherIsBetter) {
  if (tests.length < 2) return '';
  const last = valueFn(tests[tests.length - 1]), prev = valueFn(tests[tests.length - 2]);
  if (last == null || prev == null) return '';
  const diff = Math.round((last - prev) * 10) / 10;
  if (diff === 0) return `<span class="exam-trend-badge flat">– no change</span>`;
  const improved = higherIsBetter ? diff > 0 : diff < 0;
  return `<span class="exam-trend-badge ${improved ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} vs last</span>`;
}

let examProgressChart = null, examRankChart = null, examRadarChart = null, examWebChart = null, examSubjBarChart = null;
function renderExamCharts(tests) {
  const progCanvas = document.getElementById('examProgressChart');
  const progMsg = document.getElementById('examProgNoData');
  [examProgressChart, examRankChart, examRadarChart, examWebChart, examSubjBarChart].forEach(c => c && c.destroy());
  examProgressChart = examRankChart = examRadarChart = examWebChart = examSubjBarChart = null;
  document.getElementById('examMarksTrendBadge').innerHTML = '';
  document.getElementById('examRankTrendBadge').innerHTML = '';

  // "Other" mode has no rank/percentile data and no Paper Analysis portal (topics are JEE/NEET-specific),
  // so the Rank chart and the whole Analysis-derived charts row (Subject strengths + Attempted vs Scored) are hidden entirely.
  const isOther = examMode === 'other';
  const rankSection = document.getElementById('examRankSection');
  const analysisRow = document.getElementById('examAnalysisChartsRow');
  if (rankSection) rankSection.style.display = isOther ? 'none' : '';
  if (analysisRow) analysisRow.style.display = isOther ? 'none' : '';

  if (!tests.length) { progCanvas.style.display = 'none'; progMsg.style.display = 'block'; document.getElementById('examWebSubjPicker').innerHTML = ''; return; }
  progCanvas.style.display = 'block'; progMsg.style.display = 'none';

  const tc = '#7fae8f';
  const gc = 'rgba(34,197,94,0.1)';
  const dark = document.documentElement.dataset.theme !== 'light';
  const avgLineColor = dark ? '#f0ede8' : '#111112';
  const pctFn = t => t.totalMarks ? Math.round((t.obtainedMarks / t.totalMarks) * 1000) / 10 : 0;
  // Percentile is stored on the test when available; otherwise derive it from rank + total candidates (same formula as entry time)
  const percentileFn = t => t.overallPercentile != null ? t.overallPercentile : examCalcPercentile(t.overallRank, t.totalStudents);

  // Every test gets its own x-axis slot — two tests sharing a date (e.g. two JEE Advanced attempts the
  // same day) are two distinct points, never merged. A dotted "Day avg" line overlays the mean for any
  // date shared by more than one test (see examDayAvgLine above).
  const chartLabels = tests.map(t => t.name);

  // Progress over time (marks %) — JM/JA always split into separate coloured series, plus the day-avg overlay
  document.getElementById('examMarksTrendBadge').innerHTML = examTrendBadgeHTML(tests, pctFn, true);
  examProgressChart = new Chart(progCanvas, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        ...examBuildJmJaDatasets(tests, pctFn, '#22c55e'),
        { type: 'line', label: 'Day avg', data: examDayAvgLine(tests, pctFn), borderColor: avgLineColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0, fill: false, spanGaps: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
        y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, callback: v => v + '%' }, beginAtZero: true, max: 100 }
      }
    }
  });

  // Percentile over time — higher is better; JM/JA split the same way, plus the day-avg overlay. Skipped entirely for "Other".
  if (!isOther) {
    document.getElementById('examRankTrendBadge').innerHTML = examTrendBadgeHTML(tests, percentileFn, true);
    examRankChart = new Chart(document.getElementById('examRankChart'), {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          ...examBuildJmJaDatasets(tests, percentileFn, '#f5c842'),
          { type: 'line', label: 'Day avg', data: examDayAvgLine(tests, percentileFn), borderColor: avgLineColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0, fill: false, spanGaps: true }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
          y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, callback: v => v + '%' }, beginAtZero: true, max: 100 }
        }
      }
    });
  }

  // Subject-wise performance per test — one LINE per subject (e.g. Physics/Chemistry/Maths for JEE),
  // all superimposed on one chart, plus a dotted overlay for the average of those subjects per test.
  // JEE/NEET group by known subject family; Boards/Other plot every distinct subject name the user has actually added.
  const famSet = new Set();
  const subjNameSet = new Set();
  tests.forEach(t => (t.subjects || []).forEach(s => {
    const f = examSubjFamily(s.name);
    if (f) famSet.add(f);
    if (s.name) subjNameSet.add(s.name);
  }));
  const fams = (examMode === 'jee' || examMode === 'neet') ? [...famSet] : [...subjNameSet];
  const subjLinePalette = ['#5b8dee', '#22c55e', '#f5c842', '#b06aed', '#e84a8a', '#f97316', '#2dd4bf', '#a3a3a3'];
  const byFamily = examMode === 'jee' || examMode === 'neet';
  const subjValueFns = fams.map(f => t => {
    const s = byFamily ? (t.subjects || []).find(x => examSubjFamily(x.name) === f) : (t.subjects || []).find(x => x.name === f);
    return s ? (s.max ? Math.round((s.score / s.max) * 1000) / 10 : s.score) : null;
  });
  const subjAvgData = tests.map((t, i) => {
    const vals = subjValueFns.map(fn => fn(t)).filter(v => v != null);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  });
  examSubjBarChart = new Chart(document.getElementById('examSubjBarChart'), {
    type: 'line',
    data: {
      labels: tests.map(t => t.name),
      datasets: [
        ...fams.map((f, i) => ({
          label: byFamily ? (f.charAt(0).toUpperCase() + f.slice(1)) : f,
          data: tests.map(subjValueFns[i]),
          borderColor: byFamily ? EXAM_SUBJ_COLOR[f] : subjLinePalette[i % subjLinePalette.length],
          backgroundColor: 'transparent',
          borderWidth: 2, pointRadius: 3, pointBackgroundColor: byFamily ? EXAM_SUBJ_COLOR[f] : subjLinePalette[i % subjLinePalette.length],
          tension: .3, fill: false, spanGaps: true
        })),
        { label: 'Avg of subjects', data: subjAvgData, borderColor: avgLineColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: 0, fill: false, spanGaps: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: !!fams.length, position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
        y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 } }, beginAtZero: true }
      }
    }
  });

  // Weak/strong broad-topic radar and the Attempted-vs-Scored web are both built from Paper Analysis data,
  // which doesn't exist for "Other" mode (no Paper Analysis portal there) — skip building them entirely.
  if (isOther) return;

  // Weak/strong broad-topic radar. Paper Analysis entries are marks (attempted/scored), not percentages, so this
  // converts them into a real percentage before plotting: total marks scored ÷ total marks attempted, per topic,
  // pooled across every test — not a raw average of the entered mark values (which the old version plotted as-is).
  const unitAgg = {};
  tests.forEach(t => { if (!t.analysis) return; Object.values(t.analysis).forEach(units => Object.keys(units).forEach(u => {
    const v = units[u]; if (v.attempted === '' || v.attempted == null || v.scored === '' || v.scored == null) return;
    if (!unitAgg[u]) unitAgg[u] = { attSum: 0, scoSum: 0 };
    unitAgg[u].attSum += Number(v.attempted); unitAgg[u].scoSum += Number(v.scored);
  })); });
  const unitNames = Object.keys(unitAgg);
  const unitAccuracyPct = n => unitAgg[n].attSum > 0 ? Math.round(Math.max(0, Math.min(100, (unitAgg[n].scoSum / unitAgg[n].attSum) * 100))) : 0;
  examRadarChart = new Chart(document.getElementById('examRadarChart'), {
    type: 'radar',
    data: {
      labels: unitNames.length ? unitNames : ['No analysis data yet'],
      datasets: [{
        label: 'Accuracy % (scored ÷ attempted)', data: unitNames.length ? unitNames.map(unitAccuracyPct) : [0],
        backgroundColor: 'rgba(34,197,94,.25)', borderColor: '#22c55e', pointBackgroundColor: '#22c55e'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { r: { min: 0, max: 100, grid: { color: gc }, angleLines: { color: gc }, pointLabels: { color: tc, font: { size: 8 } }, ticks: { display: false } } }
    }
  });

  // Attempted vs Scored web, per subject (togglable)
  const subjNames = [...new Set(tests.flatMap(t => Object.keys(t.analysis || {})))];
  const picker = document.getElementById('examWebSubjPicker');
  if (subjNames.length) {
    if (!examWebSubj || !subjNames.includes(examWebSubj)) examWebSubj = subjNames[0];
    picker.innerHTML = `<select onchange="setExamWebSubj(this.value)">${subjNames.map(n => `<option value="${escHtml(n)}" ${n === examWebSubj ? 'selected' : ''}>${escHtml(n)}</option>`).join('')}</select>`;
  } else { picker.innerHTML = ''; }

  // wUnitAgg holds raw summed marks per topic; the two series plotted below are both derived percentages,
  // not the raw marks themselves — "Attempted %" is each topic's share of the marks attempted in this subject,
  // "Scored %" is that topic's accuracy (marks scored ÷ marks attempted). Both land on a normal 0–100 scale.
  const wUnitAgg = {}; // unit -> {attSum,scoSum}
  if (examWebSubj) {
    tests.forEach(t => {
      const units = t.analysis?.[examWebSubj]; if (!units) return;
      Object.keys(units).forEach(u => {
        const v = units[u];
        if (!wUnitAgg[u]) wUnitAgg[u] = { attSum: 0, scoSum: 0 };
        if (v.attempted !== '' && v.attempted != null) wUnitAgg[u].attSum += Number(v.attempted);
        if (v.scored !== '' && v.scored != null) wUnitAgg[u].scoSum += Number(v.scored);
      });
    });
  }
  const wNames = Object.keys(wUnitAgg);
  const wTotalAttempted = wNames.reduce((sum, n) => sum + wUnitAgg[n].attSum, 0);
  const wAttemptedSharePct = n => wTotalAttempted > 0 ? Math.round((wUnitAgg[n].attSum / wTotalAttempted) * 100) : 0;
  const wAccuracyPct = n => wUnitAgg[n].attSum > 0 ? Math.round(Math.max(0, Math.min(100, (wUnitAgg[n].scoSum / wUnitAgg[n].attSum) * 100))) : 0;
  examWebChart = new Chart(document.getElementById('examWebChart'), {
    type: 'radar',
    data: {
      labels: wNames.length ? wNames : ['No analysis data yet'],
      datasets: [
        { label: 'Attempted % (share of marks attempted)', data: wNames.length ? wNames.map(wAttemptedSharePct) : [0], backgroundColor: 'rgba(91,141,238,.22)', borderColor: '#5b8dee', pointBackgroundColor: '#5b8dee' },
        { label: 'Scored % (accuracy)', data: wNames.length ? wNames.map(wAccuracyPct) : [0], backgroundColor: 'rgba(34,197,94,.22)', borderColor: '#22c55e', pointBackgroundColor: '#22c55e' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: { r: { min: 0, max: 100, grid: { color: gc }, angleLines: { color: gc }, pointLabels: { color: tc, font: { size: 8 } }, ticks: { display: false } } }
    }
  });
}
function setExamWebSubj(name) { examWebSubj = name; renderExamCharts(examTestsForMode()); }

/* ── Exam Analytics: test frequency (per month) + time analysis (from Paper Breakdown data) ── */
let examFreqChart = null, examTimeChart = null;
function renderExamExtra(tests) {
  [examFreqChart, examTimeChart].forEach(c => c && c.destroy());
  examFreqChart = examTimeChart = null;
  const fc = document.getElementById('examFreqChart'), fm = document.getElementById('examFreqNoData');
  const tcv = document.getElementById('examTimeChart'), tm = document.getElementById('examTimeNoData');
  if (!fc || !tcv) return;
  const tc = '#7fae8f', gc = 'rgba(34,197,94,0.1)';
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dated = tests.filter(t => t.date);
  if (!dated.length) { fc.style.display = 'none'; fm.style.display = 'block'; }
  else {
    fc.style.display = 'block'; fm.style.display = 'none';
    const counts = {}; dated.forEach(t => { const k = t.date.slice(0, 7); counts[k] = (counts[k] || 0) + 1; });
    const keys = Object.keys(counts).sort();
    let [y, m] = keys[0].split('-').map(Number); const [ey, em] = keys[keys.length - 1].split('-').map(Number);
    const months = [];
    while (y < ey || (y === ey && m <= em)) { months.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
    const shown = months.slice(-12);
    examFreqChart = new Chart(fc, {
      type: 'bar',
      data: { labels: shown.map(k => MON[+k.slice(5) - 1] + ' ' + k.slice(2, 4)), datasets: [{ label: 'Tests', data: shown.map(k => counts[k] || 0), backgroundColor: '#22c55e', borderRadius: 4, borderSkipped: false }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 } } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, precision: 0 }, beginAtZero: true } } }
    });
  }
  const timed = tests.filter(t => t.bdData && (t.bdData.q || []).some(r => r && r.t != null));
  if (!timed.length) { tcv.style.display = 'none'; tm.style.display = 'block'; return; }
  tcv.style.display = 'block'; tm.style.display = 'none';
  const SC = { Physics: '#3b82f6', Chemistry: '#f59e0b', Mathematics: '#22c55e', Other: '#a78bfa' };
  const subs = ['Physics', 'Chemistry', 'Mathematics', 'Other'].filter(sb => timed.some(t => t.bdData.q.some(r => r && r.s === sb && r.t != null)));
  examTimeChart = new Chart(tcv, {
    type: 'bar',
    data: { labels: timed.map(t => t.name), datasets: subs.map(sb => ({ label: sb, backgroundColor: SC[sb], borderRadius: 3,
      data: timed.map(t => Math.round(t.bdData.q.filter(r => r && r.s === sb && r.t != null).reduce((a, r) => a + r.t, 0) / 6) / 10) })) },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: { x: { stacked: true, grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
                y: { stacked: true, grid: { color: gc }, ticks: { color: tc, font: { size: 9 } }, beginAtZero: true, title: { display: true, text: 'Minutes', color: tc, font: { size: 9 } } } } }
  });
}



/* ── Exam Analytics: quick summary pop-up (opened from the blue Analysis button) ── */
function openExamSummary(id) {
  const t = state.exams.tests[id]; if (!t || !t.bdData) return;
  const q = (t.bdData.q || []).filter(Boolean), att = q.filter(r => 'CWP'.includes(r.c));
  const C = q.filter(r => r.c === 'C').length, acc = att.length ? Math.round(C / att.length * 100) : 0;
  const neg = q.reduce((a, r) => a + (r.m < 0 ? -r.m : 0), 0), timed = q.filter(r => r.t != null), secs = timed.reduce((a, r) => a + r.t, 0);
  const avg = timed.length ? secs / timed.length : 0, slow = avg ? timed.filter(r => r.t > avg * 1.5).length : 0;
  const hm = s => s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.round(s % 3600 / 60) + 'm' : Math.round(s / 60) + 'm';
  const ch = {}; q.forEach(r => { if (!r.g || !'CWP'.includes(r.c)) return; const a = ch[r.g] || (ch[r.g] = { n: 0, c: 0 }); a.n++; if (r.c === 'C') a.c++; });
  const L = Object.entries(ch).filter(([, a]) => a.n >= 2).map(([k, a]) => ({ n: k.split('|')[1] || k, p: a.c / a.n }));
  const weak = L.filter(x => x.p < .5).sort((a, b) => a.p - b.p).slice(0, 3).map(x => x.n), strong = L.filter(x => x.p >= .75).sort((a, b) => b.p - a.p).slice(0, 3).map(x => x.n);
  const bars = (t.subjects || []).map(s => { const p = s.max ? Math.max(0, Math.min(100, s.score / s.max * 100)) : 0; return `<div class="es-bar"><span>${escHtml(s.name)}</span><div><i style="width:${p}%"></i></div><b>${s.score}/${s.max}</b></div>`; }).join('');
  const jm = examJmJa(t), tag = [t.date ? dateLabel(t.date) : '', jm === 'JM' ? 'JEE Main' : jm === 'JA' ? 'JEE Advanced' : '', t.difficulty ? ({ easy: 'Easy', mod: 'Moderate', moderate: 'Moderate', tough: 'Tough' })[t.difficulty] : ''].filter(Boolean).join(' · ');
  const st = (l, v) => `<div class="es-stat">${l}<b>${v}</b></div>`;
  document.getElementById('examSumBody').innerHTML = `<div class="es-name">${escHtml(t.name)}</div><div class="es-sub">${escHtml(tag)}</div>
    <div class="es-stats">${st('Score', `${t.obtainedMarks}/${t.totalMarks}`)}${st('Accuracy', acc + '%')}${st('Negative marks', '−' + neg)}${st('Attempted', `${att.length}/${q.length}`)}${st('Time', secs ? hm(secs) : '—')}${st('Slow questions', secs ? slow : '—')}</div>
    ${bars}
    <div class="es-line"><b>Weak:</b> ${weak.length ? escHtml(weak.join(', ')) : '—'}</div>
    <div class="es-line"><b>Strong:</b> ${strong.length ? escHtml(strong.join(', ')) : '—'}</div>`;
  document.getElementById('examSumOpen').onclick = () => { closeModal('examSumModal'); bdLoadTest(id); };
  openModal('examSumModal');
}
