/* ═══════════════════════════════════════════════════════════════
   QTrack 0.5.0 — app.js
   Architecture: Firebase REST, write-then-read, no polling conflicts
═══════════════════════════════════════════════════════════════ */

const FB = 'https://qtrack-d4724-default-rtdb.firebaseio.com';
const VERSION = '1.2.0';

/* ── State ── */
let sessionId = '';
let deviceId = '';
let state = { users: {}, history: {}, subjects: [], locks: {}, study: { logs: {} }, exams: { tests: {}, locks: {} }, syllabus: { progress: {}, custom: {} }, meta: { ts: 0 } };
/* subjects: [{id, name, color}] */

let lastKnownTs = 0;
let pollTimer = null;
let isWriting = false;   // simple boolean mutex — only one write at a time

/* ── Firebase helpers ── */
function dbUrl(path) { return `${FB}/sessions/${sessionId}${path}.json`; }

async function fbGet(path) {
  const r = await fetch(dbUrl(path));
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

async function fbPut(path, data) {
  const r = await fetch(dbUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error(`PUT ${path} → ${r.status}`);
  return r.json();
}

async function fbDelete(path) {
  await fetch(dbUrl(path), { method: 'DELETE' });
}

async function bumpMeta() {
  const ts = Date.now();
  await fbPut('/meta', { ts });
  lastKnownTs = ts;
  return ts;
}

/* ── Single write queue ── */
// All mutations go through doWrite() which serialises writes and
// re-fetches the full state afterwards so UI is always consistent.
async function doWrite(writeFn) {
  if (isWriting) { showToast('Please wait…'); return false; }
  isWriting = true;
  setSyncStatus('saving');
  stopPoll(); // pause polling during write
  try {
    await writeFn();
    await bumpMeta();
    // Re-fetch authoritative state from Firebase
    const fresh = await fbGet('');
    applyRemote(fresh);
    setSyncStatus('ok');
    return true;
  } catch (e) {
    console.error('Write failed:', e);
    setSyncStatus('error');
    return false;
  } finally {
    isWriting = false;
    startPoll(); // resume polling
  }
}

/* ── Apply remote state to local ── */
function applyRemote(remote) {
  if (!remote) return;
  // Users: Firebase stores as object keyed by uid
  const usersObj = remote.users || {};
  state.users = usersObj;
  state.history = remote.history || {};
  state.locks = remote.locks || {};
  state.study = remote.study || { logs: {} };
  if (!state.study.logs) state.study.logs = {};
  state.exams = remote.exams || { tests: {}, locks: {} };
  if (!state.exams.tests) state.exams.tests = {};
  if (!state.exams.locks) state.exams.locks = {};
  state.syllabus = remote.syllabus || { progress: {}, custom: {} };
  if (!state.syllabus.progress) state.syllabus.progress = {};
  if (!state.syllabus.custom) state.syllabus.custom = {};
  if (typeof revPending === 'undefined' || !Object.keys(revPending).length) state.revision = remote.revision || { progress: {} };   // keep unsaved ticks until they are saved
  if (!state.revision.progress) state.revision.progress = {};
  state.deadline = remote.deadline || null;
  // Subjects: stored as array
  if (Array.isArray(remote.subjects) && remote.subjects.length > 0) {
    state.subjects = remote.subjects;
  }
  if (remote.meta && remote.meta.ts) lastKnownTs = remote.meta.ts;
  saveLocal();
  renderAll();
  renderStudyChips();
  renderStudyStats();
  if (document.getElementById('examPage')?.classList.contains('active')) renderExamPage();
  if (document.getElementById('syllabusPage')?.classList.contains('active')) renderSyllabusPage();
  if (document.getElementById('revisionPage')?.classList.contains('active')) renderRevisionPage();
  renderDeadline();
  publishGlobal();
}

/* ── LocalStorage cache ── */
function saveLocal() {
  try { localStorage.setItem('qttrack_cache_' + sessionId, JSON.stringify(state)); } catch (e) {}
}
function loadLocal() {
  try {
    const raw = localStorage.getItem('qttrack_cache_' + sessionId);
    if (raw) { const p = JSON.parse(raw); state = p; }
  } catch (e) {}
}

/* ── Session ── */
function initSession() {
  let did = localStorage.getItem('qttrack_device_id');
  if (!did) { did = randId() + randId(); localStorage.setItem('qttrack_device_id', did); }
  deviceId = did;
  let sid = localStorage.getItem('qttrack_sid_v5');
  if (!sid) { sid = randId() + randId(); localStorage.setItem('qttrack_sid_v5', sid); }
  sessionId = sid;
  document.getElementById('sessionDisplay').textContent = fmtSid(sid);
  document.getElementById('sessionIdDisplay').value = fmtSid(sid);
  recordSessionHistory(sid);
}

/* ── Session history (stored on this device) ── */
const SESS_HIST_KEY = 'qttrack_session_history';
function getSessionHistory() {
  try { return JSON.parse(localStorage.getItem(SESS_HIST_KEY) || '[]'); } catch (e) { return []; }
}
function recordSessionHistory(sid) {
  let list = getSessionHistory().filter(x => x.id !== sid);
  list.unshift({ id: sid, ts: Date.now() });
  list = list.slice(0, 12);
  try { localStorage.setItem(SESS_HIST_KEY, JSON.stringify(list)); } catch (e) {}
  renderSessionHistory();
}
function renderSessionHistory() {
  const el = document.getElementById('sessHistList');
  if (!el) return;
  const list = getSessionHistory();
  if (!list.length) { el.innerHTML = '<div class="sess-hist-empty">No previous sessions yet.</div>'; return; }
  el.innerHTML = list.map(x => {
    const cur = x.id === sessionId;
    const when = new Date(x.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `<div class="sess-hist-row">
      <span class="sess-hist-id">${fmtSid(x.id)}</span>
      <span class="sess-hist-when">${when}</span>
      ${cur ? '<span class="sess-hist-cur">current</span>'
            : `<button class="sess-hist-join" onclick="joinSessionId('${x.id}')">Join</button>`}
    </div>`;
  }).join('');
}
async function joinSessionId(sid) {
  if (sid === sessionId) return;
  sessionId = sid;
  localStorage.setItem('qttrack_sid_v5', sid);
  document.getElementById('sessionDisplay').textContent = fmtSid(sid);
  document.getElementById('sessionIdDisplay').value = fmtSid(sid);
  state = { users: {}, history: {}, subjects: [], locks: {}, study: { logs: {} }, exams: { tests: {}, locks: {} }, syllabus: { progress: {}, custom: {} }, meta: { ts: 0 } };
  lastKnownTs = 0;
  recordSessionHistory(sid);
  closeModal('sessionModal');
  await loadRemote();
  showToast('Switched session');
}

function randId() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function fmtSid(s) { return s.slice(0, 4) + '-' + s.slice(4, 8); }

function copySession() {
  navigator.clipboard.writeText(sessionId)
    .then(() => showToast('Session ID copied!'))
    .catch(() => showToast('Your ID: ' + fmtSid(sessionId)));
}

/* ── Share invite (session popup) ──
   Builds a shareable link that carries the session ID as a query param, plus a short
   code and a friendly ready-to-send message. Opening the link with ?join=SID auto-fills
   the join box (wired up below in checkJoinLink()). */
function buildShareInviteLink() {
  const url = new URL(location.href);
  url.pathname = '/'; url.search = ''; url.hash = '';
  url.searchParams.set('join', sessionId);
  return url.toString();
}
function shareSessionInvite() {
  const link = buildShareInviteLink();
  const msg = `Hey! Join my QTrack study lobby so we can track questions together 📚\n\nLink: ${link}\nOr just enter this code in QTrack: ${fmtSid(sessionId)}`;
  document.getElementById('shareInviteText').value = msg;
  closeModal('sessionModal');
  openModal('shareInviteModal');
  if (navigator.share) {
    navigator.share({ title: 'Join my QTrack session', text: msg, url: link }).catch(() => {});
  }
}
function copyShareInvite() {
  const txt = document.getElementById('shareInviteText').value;
  navigator.clipboard.writeText(txt)
    .then(() => showToast('Invite copied!'))
    .catch(() => showToast('Could not copy — select the text manually'));
}
/* If the app was opened via a shared invite link (?join=SID), pre-fill the join box
   so the friend just has to tap Join once. */
function checkJoinLink() {
  const p = new URLSearchParams(location.search).get('join');
  if (!p) return;
  const clean = p.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length >= 8 && clean !== sessionId) {
    const inp = document.getElementById('joinSidInput');
    if (inp) inp.value = fmtSid(clean);
    openModal('sessionModal');
    showToast('Invite link detected — tap Join to connect');
  }
  history.replaceState({}, '', location.pathname);
}

async function joinSession() {
  const raw = document.getElementById('joinSidInput').value.trim();
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 8) { showToast('Enter the full session ID'); return; }
  sessionId = clean;
  localStorage.setItem('qttrack_sid_v5', clean);
  document.getElementById('sessionDisplay').textContent = fmtSid(clean);
  document.getElementById('sessionIdDisplay').value = fmtSid(clean);
  state = { users: {}, history: {}, subjects: [], locks: {}, study: { logs: {} }, exams: { tests: {}, locks: {} }, syllabus: { progress: {}, custom: {} }, meta: { ts: 0 } };
  lastKnownTs = 0;
  closeModal('sessionModal');
  recordSessionHistory(clean);
  await loadRemote();
  showToast('Joined!');
}

/* ── Load ── */
async function loadRemote() {
  setSyncStatus('loading');
  try {
    const remote = await fbGet('');
    applyRemote(remote);
    setSyncStatus('ok');
  } catch (e) {
    // Offline — use local cache
    loadLocal();
    renderAll();
    setSyncStatus('error');
  }
}

/* ── Poll ── */
function startPoll() {
  stopPoll();
  pollTimer = setInterval(poll, 5000);
}
function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}
async function poll() {
  if (isWriting) return;
  try {
    const meta = await fbGet('/meta');
    const ts = meta && meta.ts ? meta.ts : 0;
    if (ts > lastKnownTs) {
      const remote = await fbGet('');
      if (!isWriting) { // still not writing after fetch
        applyRemote(remote);
        setSyncStatus('ok');
      }
    }
  } catch (e) { setSyncStatus('error'); }
}

/* ════════════════════════════════════════════════════════════
   USER ACTIONS
════════════════════════════════════════════════════════════ */

function addUser() {
  const inp = document.getElementById('newUserName');
  const name = inp.value.trim();
  if (!name) return;
  const uid = 'u' + Date.now();
  inp.value = '';
  closeModal('addUserModal');
  doWrite(() => fbPut('/users/' + uid, { id: uid, name }))
    .then(ok => { if (ok) showToast(name + ' added!'); });
}

function deleteUser(uid) {
  if (!confirm('Remove this person?')) return;
  fetch(`${FB}/global/lb/${sessionId}_${uid}.json`, { method: 'DELETE' }).catch(() => {});
  doWrite(async () => {
    await fbDelete('/users/' + uid);
    // Remove all history for this user
    const dates = Object.keys(state.history);
    await Promise.all(dates.map(dt => fbDelete('/history/' + dt + '/' + uid)));
    const lockDates = Object.keys(state.locks || {});
    await Promise.all(lockDates.map(dt => fbDelete('/locks/' + dt + '/' + uid)));
  });
}

/* ── Day locking ("Log done") ── */
function isLocked(uid, dt) { return !!((state.locks || {})[dt] || {})[uid]; }
function selectedLogDate(uid) {
  const el = document.getElementById('logdate_' + uid);
  const v = el && el.value ? el.value : todayStr();
  return v > todayStr() ? todayStr() : v;
}
function onLogDateChange(uid) { logDatePick[uid] = selectedLogDate(uid); renderCards(); }

function markLogDone(uid) {
  const dt = selectedLogDate(uid);
  if (isLocked(uid, dt)) { showToast('Already locked'); return; }
  doWrite(() => fbPut('/locks/' + dt + '/' + uid, Date.now()))
    .then(ok => { if (ok) playDoneCheck(uid); });
}
function playDoneCheck(uid) {
  const el = document.getElementById('donecheck_' + uid);
  if (!el) return;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

function addQuestions(uid) {
  const subj = state.subjects;
  if (!subj.length) { showToast('Add subjects first (tap Subjects on this card)'); return; }
  const dt = selectedLogDate(uid);
  if (isLocked(uid, dt)) { showToast('That day is locked'); return; }
  const vals = {};
  let any = false;
  subj.forEach(s => {
    const el = document.getElementById(`inp_${s.id}_${uid}`);
    const v = Math.max(0, parseInt(el?.value) || 0);
    vals[s.id] = v;
    if (v) any = true;
  });
  if (!any) { showToast('Enter at least one value'); return; }
  // Build merged entry
  const cur = (state.history[dt] || {})[uid] || {};
  const entry = {};
  subj.forEach(s => { entry[s.id] = (cur[s.id] || 0) + (vals[s.id] || 0); });
  // Clear inputs immediately
  subj.forEach(s => { const el = document.getElementById(`inp_${s.id}_${uid}`); if (el) el.value = ''; });
  const userName = state.users[uid]?.name || '';
  doWrite(() => fbPut('/history/' + dt + '/' + uid, entry))
    .then(ok => { if (ok) showToast('Updated ' + userName + (dt === todayStr() ? '' : ' · ' + dateLabel(dt))); });
}

function saveEdit(uid) {
  const subj = state.subjects;
  const dt = selectedLogDate(uid);
  if (isLocked(uid, dt)) { showToast('That day is locked'); return; }
  const entry = {};
  let any = false;
  subj.forEach(s => {
    const el = document.getElementById(`einp_${s.id}_${uid}`);
    const v = Math.max(0, parseInt(el?.value) || 0);
    entry[s.id] = v;
    if (v) any = true;
  });
  closeEdit(uid);
  doWrite(async () => {
    if (any) await fbPut('/history/' + dt + '/' + uid, entry);
    else await fbDelete('/history/' + dt + '/' + uid);
  }).then(ok => { if (ok) showToast('Corrected!'); });
}

/* ════════════════════════════════════════════════════════════
   SUBJECTS
════════════════════════════════════════════════════════════ */
const PRESET_COLORS = ['#5b8dee','#e8724a','#4ecba4','#f5c842','#b06aed','#e84a8a','#4ab5e8','#3ad68a','#e84a4a','#ff8c42'];

// Working copy while modal is open — only committed on Save
let subjDraft = [];

function openSubjModal() {
  subjDraft = JSON.parse(JSON.stringify(state.subjects)); // deep copy
  renderSubjDraft();
  openModal('subjModal');
}

function renderSubjDraft() {
  const list = document.getElementById('subjDraftList');
  if (!subjDraft.length) {
    list.innerHTML = '<div class="subj-empty">No subjects yet. Add one below.</div>';
    return;
  }
  list.innerHTML = subjDraft.map((s, i) => `
    <div class="subj-item" data-i="${i}">
      <div class="subj-swatch" style="background:${s.color}" onclick="pickColor(${i})" title="Change colour"></div>
      <input class="subj-name-inp" value="${escHtml(s.name)}" maxlength="20"
        oninput="subjDraft[${i}].name=this.value.trim()||subjDraft[${i}].name">
      <button class="subj-del" onclick="removeSubjDraft(${i})">✕</button>
    </div>`).join('');
}

function addSubjDraft() {
  const inp = document.getElementById('newSubjInp');
  const name = inp.value.trim();
  if (!name) return;
  if (subjDraft.length >= 10) { showToast('Max 10 subjects'); return; }
  subjDraft.push({ id: 's' + Date.now(), name, color: PRESET_COLORS[subjDraft.length % PRESET_COLORS.length] });
  inp.value = '';
  renderSubjDraft();
}

function removeSubjDraft(i) {
  subjDraft.splice(i, 1);
  renderSubjDraft();
}

async function saveSubjects() {
  // Flush any pending name edits from inputs
  document.querySelectorAll('#subjDraftList .subj-name-inp').forEach((inp, i) => {
    if (subjDraft[i]) subjDraft[i].name = inp.value.trim() || subjDraft[i].name;
  });
  const toSave = JSON.parse(JSON.stringify(subjDraft));
  closeModal('subjModal');
  const ok = await doWrite(() => fbPut('/subjects', toSave));
  if (ok) showToast('Subjects saved!');
}

/* Colour picker */
let colorPickIdx = -1;
let colorPickVal = '';

function pickColor(i) {
  colorPickIdx = i;
  colorPickVal = subjDraft[i].color;
  const pc = document.getElementById('presetSwatches');
  pc.innerHTML = PRESET_COLORS.map(c =>
    `<div class="preset-sw ${c === colorPickVal ? 'sel' : ''}"
      style="background:${c}" onclick="selectPreset('${c}')"></div>`).join('');
  document.getElementById('colorWheel').value = colorPickVal;
  document.getElementById('colorPreview').style.background = colorPickVal;
  openModal('colorModal');
}

function selectPreset(c) {
  colorPickVal = c;
  document.getElementById('colorWheel').value = c;
  document.getElementById('colorPreview').style.background = c;
  document.querySelectorAll('.preset-sw').forEach(el =>
    el.classList.toggle('sel', el.getAttribute('onclick') === `selectPreset('${c}')`));
}

function applyColor() {
  if (colorPickIdx >= 0) {
    subjDraft[colorPickIdx].color = colorPickVal;
    closeModal('colorModal');
    renderSubjDraft();
  }
}

/* ════════════════════════════════════════════════════════════
   DATE UTILS
════════════════════════════════════════════════════════════ */
/* A new day starts at 5 AM, not midnight — late-night study still counts
   towards the previous calendar day. */
const DAY_START_HOUR = 5;
function logicalNow() {
  const d = new Date();
  d.setHours(d.getHours() - DAY_START_HOUR);
  return d;
}
function todayStr() {
  const d = logicalNow();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function pad(n) { return String(n).padStart(2, '0'); }
function dateLabel(ds) {
  const [y, m, d] = ds.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function getMondayOfWeek() {
  const n = logicalNow(), dow = n.getDay();
  const d = new Date(n); d.setDate(n.getDate() - (dow === 0 ? 6 : dow - 1)); d.setHours(0, 0, 0, 0); return d;
}
function getMonthStart() { const n = logicalNow(); return new Date(n.getFullYear(), n.getMonth(), 1); }

/* ════════════════════════════════════════════════════════════
   DATA HELPERS
════════════════════════════════════════════════════════════ */
function userList() { return Object.values(state.users); }

/* ── Anonymous mode ──
   A person can hide their question data from every OTHER device sharing this
   session. Only the device that switched it on ("the owner") keeps seeing
   the real numbers; everyone else just sees that anonymous mode is on. */
function isAnonHidden(uid) {
  const u = state.users[uid];
  return !!(u && u.anonymous && u.anonOwner !== deviceId);
}
function isAnonMine(uid) {
  const u = state.users[uid];
  return !!(u && u.anonymous && u.anonOwner === deviceId);
}
function visibleUserList() { return userList().filter(u => !isAnonHidden(u.id)); }

function toggleAnonymous(uid) {
  const u = state.users[uid];
  if (!u) return;
  if (u.anonymous && u.anonOwner !== deviceId) {
    showToast("Only the device that turned this on can turn it off");
    return;
  }
  const next = !u.anonymous;
  doWrite(() => fbPut('/users/' + uid, { ...u, anonymous: next, anonOwner: next ? deviceId : null }))
    .then(ok => { if (ok) showToast(next ? 'Anonymous mode on — hidden on other devices' : 'Anonymous mode off'); });
}

function getUserSubj(uid, scope) {
  const res = {}; state.subjects.forEach(s => res[s.id] = 0);
  let dates = [];
  if (scope === 'today') dates = [todayStr()];
  else if (scope === 'alltime') dates = Object.keys(state.history);
  else if (scope === 'week') {
    const mon = getMondayOfWeek();
    dates = Object.keys(state.history).filter(ds => { const [y, m, d] = ds.split('-'); return new Date(+y, +m - 1, +d) >= mon; });
  } else if (scope === 'month') {
    const ms = getMonthStart();
    dates = Object.keys(state.history).filter(ds => { const [y, m, d] = ds.split('-'); return new Date(+y, +m - 1, +d) >= ms; });
  } else dates = [scope];
  dates.forEach(dt => {
    const day = (state.history[dt] || {})[uid] || {};
    state.subjects.forEach(s => { res[s.id] += day[s.id] || 0; });
  });
  return res;
}

function getUserTotal(uid, scope, sid = null) {
  const d = getUserSubj(uid, scope);
  if (sid) return d[sid] || 0;
  return state.subjects.reduce((s, sub) => s + (d[sub.id] || 0), 0);
}

function pct(v, t) { return t === 0 ? 0 : Math.round((v / t) * 100); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* Escapes a string for safe embedding inside a single-quoted argument of an inline onclick="fn('...')"
   attribute. sylKey() (and a few other id-like helpers) keep characters like apostrophes and ampersands
   in the key itself — on purpose, so existing stored progress keeps matching the same key — but that
   apostrophe breaks out of the single-quoted onclick string, which silently kills the click handler
   (e.g. a chapter named "Newton's Laws & Friction" simply wouldn't open). This escapes at the point the
   value is embedded in an attribute, not at the key source, so nothing about stored data changes. */
function escJs(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

/* ════════════════════════════════════════════════════════════
   RENDER
════════════════════════════════════════════════════════════ */
let mainChart = null, weekChart = null;
let chartView = 'today';
let calYear, calMonth, selCalDate = null;
let lbScope = 'today', lbSubj = 'all';
let weekOffset = 0;      // 0 = current week, -1 = previous week, ...
let monthSel = null;     // 'YYYY-MM' of month currently shown in Week/Month main-chart view

function renderAll() {
  try { renderDonuts(); } catch (e) { console.error(e); }
  renderSummary();
  renderLegend();
  renderMainChart();
  renderWeekChart();
  renderCalendar();
  renderCards();
  const lb = document.getElementById('leaderboardPage');
  if (lb && lb.classList.contains('active')) renderLeaderboard();
}

function renderSummary() {
  const users = visibleUserList();
  const todayTot = users.reduce((s, u) => s + getUserTotal(u.id, 'today'), 0);
  const allTot = users.reduce((s, u) => s + getUserTotal(u.id, 'alltime'), 0);
  document.getElementById('statToday').textContent = todayTot;
  document.getElementById('statAllTime').textContent = allTot;
  const inner = document.getElementById('topPerformerInner');
  if (!users.length) {
    inner.innerHTML = '<span style="color:var(--muted)">—</span>';
    renderAllTimeDrop([]); renderTodayDrop([]);
    return;
  }
  const rankedAll = [...users].map(u => ({ ...u, score: getUserTotal(u.id, 'alltime') })).sort((a, b) => b.score - a.score);
  const rankedToday = [...users].map(u => ({ ...u, score: getUserTotal(u.id, 'today') })).sort((a, b) => b.score - a.score);
  const lead = rankedAll[1] ? rankedAll[0].score - rankedAll[1].score : rankedAll[0].score;
  inner.innerHTML = `<span class="tp-name">${escHtml(rankedAll[0].name)}</span>${lead > 0 ? `<span class="tp-lead">▲${lead}</span>` : ''}`;
  renderAllTimeDrop(rankedAll);
  renderTodayDrop(rankedToday);
}

/* Per-user all-time dropdown */
function renderAllTimeDrop(ranked) {
  const el = document.getElementById('allTimeDropdown');
  if (!el) return;
  if (!ranked.length) { el.innerHTML = '<div style="font-size:.7rem;color:var(--muted);padding:.3rem">No people yet.</div>'; return; }
  el.innerHTML = ranked.map(u => `
    <div style="display:flex;justify-content:space-between;gap:.6rem;font-size:.72rem;padding:.3rem .3rem">
      <span style="font-weight:600">${escHtml(u.name)}</span>
      <span style="font-family:'DM Mono',monospace;color:var(--muted)">${u.score}</span>
    </div>`).join('');
}
function toggleAllTimeDrop() {
  const el = document.getElementById('allTimeDropdown');
  const other = document.getElementById('todayDropdown');
  if (other) other.style.display = 'none';
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

/* Per-user today dropdown — same pattern as the All-Time one */
function renderTodayDrop(ranked) {
  const el = document.getElementById('todayDropdown');
  if (!el) return;
  if (!ranked.length) { el.innerHTML = '<div style="font-size:.7rem;color:var(--muted);padding:.3rem">No people yet.</div>'; return; }
  el.innerHTML = ranked.map(u => `
    <div style="display:flex;justify-content:space-between;gap:.6rem;font-size:.72rem;padding:.3rem .3rem">
      <span style="font-weight:600">${escHtml(u.name)}</span>
      <span style="font-family:'DM Mono',monospace;color:var(--muted)">${u.score}</span>
    </div>`).join('');
}
function toggleTodayDrop() {
  const el = document.getElementById('todayDropdown');
  const other = document.getElementById('allTimeDropdown');
  if (other) other.style.display = 'none';
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', (e) => {
  // Use btn.contains(e.target) rather than e.target !== btn — the dropdown buttons hold an
  // inner <svg>/<polyline>, so a tap's real e.target is that child, not the button element
  // itself. Comparing by reference made every single click look like an "outside click" and
  // instantly re-closed the dropdown the same button had just opened.
  const drop = document.getElementById('allTimeDropdown');
  const btn = document.getElementById('allTimeDropBtn');
  if (drop && drop.style.display === 'block' && !drop.contains(e.target) && !(btn && btn.contains(e.target))) drop.style.display = 'none';
  const drop2 = document.getElementById('todayDropdown');
  const btn2 = document.getElementById('todayDropBtn');
  if (drop2 && drop2.style.display === 'block' && !drop2.contains(e.target) && !(btn2 && btn2.contains(e.target))) drop2.style.display = 'none';
});

function renderLegend() {
  const html = state.subjects.map(s =>
    `<div class="legend-item"><div class="legend-dot" style="background:${s.color}"></div>${escHtml(s.name)}</div>`).join('');
  document.getElementById('mainLegend').innerHTML = html;
  document.getElementById('weekLegend').innerHTML = html;
}

/* ── Main chart ── */
function setChartView(view, btn) {
  chartView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const dpRow = document.getElementById('dayPickerRow');
  dpRow.classList.toggle('show', view === 'day');
  if (view === 'day' && !document.getElementById('dayPickerInput').value)
    document.getElementById('dayPickerInput').value = todayStr();
  const titles = { today: "Today's Questions", day: "Selected Day", week: "Week — per person", month: "Month — per person trend", alltime: "All-Time" };
  document.getElementById('mainChartTitle').textContent = titles[view];
  if (view === 'week') weekOffset = 0;
  if (view === 'month') monthSel = todayStr().slice(0, 7);
  renderMainChart();
}

function userColor(i) { return PRESET_COLORS[i % PRESET_COLORS.length]; }

/* day total for one person on one date */
function dayTotal(uid, ds) {
  const d = (state.history[ds] || {})[uid] || {};
  return state.subjects.reduce((t, s) => t + (d[s.id] || 0), 0);
}

/* Build the timeline for the Week view: Monday onwards for the week at `weekOffset`
   weeks relative to the current week (0 = this week, -1 = previous week, ...). */
function weekTimeline() {
  const mon = getMondayOfWeek();
  mon.setDate(mon.getDate() + weekOffset * 7);
  const keys = [], labels = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    keys.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    labels.push(dayNames[i] + ' ' + d.getDate());
  }
  return { keys, labels };
}

function weekRangeLabel() {
  const tl = weekTimeline();
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const first = tl.keys[0].split('-'), last = tl.keys[6].split('-');
  const f = `${MON[+first[1]-1]} ${+first[2]}`, l = `${MON[+last[1]-1]} ${+last[2]}`;
  return weekOffset === 0 ? `This week · ${f} – ${l}` : `${f} – ${l}`;
}

/* Build the timeline for the Month view: every day of the single month `monthSel`
   ('YYYY-MM'). */
function monthTimeline() {
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (!monthSel) monthSel = todayStr().slice(0, 7);
  const [y, mo] = monthSel.split('-').map(Number);
  const dim = new Date(y, mo, 0).getDate();
  const last = (monthSel === todayStr().slice(0, 7)) ? Number(todayStr().slice(8)) : dim;
  const keys = [], labels = [];
  for (let d = 1; d <= last; d++) {
    keys.push(monthSel + '-' + pad(d));
    labels.push(String(d));
  }
  return { keys, labels, monthName: MON[mo - 1] + ' ' + y };
}

/* Months (YYYY-MM) that have any history, plus the current month — newest first. */
function availableMonths() {
  const set = new Set(Object.keys(state.history).map(k => k.slice(0, 7)));
  set.add(todayStr().slice(0, 7));
  return [...set].sort().reverse();
}

function navWeek(dir) { weekOffset += dir; if (weekOffset > 0) weekOffset = 0; renderMainChart(); }
function navMonth(dir) {
  const months = availableMonths().sort(); // ascending
  if (!monthSel) monthSel = todayStr().slice(0, 7);
  let idx = months.indexOf(monthSel);
  idx = Math.min(Math.max(idx + dir, 0), months.length - 1);
  monthSel = months[idx];
  renderMainChart();
}
function pickMonth(val) { monthSel = val; renderMainChart(); }

function renderMainChart() {
  const canvas = document.getElementById('mainChart');
  const msg = document.getElementById('noDataMsg');
  const users = visibleUserList();
  if (!users.length || !state.subjects.length) {
    canvas.style.display = 'none'; msg.style.display = 'block';
    msg.innerHTML = !users.length ? '<strong>No people yet</strong>Tap "+ Person" to start.' : '<strong>No subjects yet</strong>Open any card and tap Subjects.';
    if (mainChart) { mainChart.destroy(); mainChart = null; } return;
  }
  canvas.style.display = 'block'; msg.style.display = 'none';
  if (mainChart) { mainChart.destroy(); mainChart = null; }

  // Timeline views: Week / Month — one individual bar per person per day
  // (grouped side-by-side, not stacked) + one trend line per person
  if (chartView === 'week' || chartView === 'month') {
    const tl = chartView === 'week' ? weekTimeline() : monthTimeline();
    const bars = users.map((u, i) => ({
      label: u.name,
      data: tl.keys.map(k => k ? dayTotal(u.id, k) : 0),
      backgroundColor: userColor(i), borderRadius: 3, borderSkipped: false,
      barPercentage: 0.9, categoryPercentage: 0.7, order: 2
    }));
    const lines = users.map((u, i) => ({
      type: 'line',
      label: u.name + ' trend',
      data: tl.keys.map(k => k ? dayTotal(u.id, k) : null),
      borderColor: userColor(i), backgroundColor: userColor(i),
      borderWidth: 2, borderDash: [5, 4], pointRadius: 0, tension: .35,
      spanGaps: true, fill: false, yAxisID: 'yLine', order: 1
    }));
    mainChart = buildChart('mainChart', tl.labels, [...bars, ...lines], tl.keys.indexOf(todayStr()), false);
    renderPeopleLegend();
    renderChartNav(tl);
    return;
  }
  renderChartNav(null);

  // Snapshot views: Today / Selected day / All-time — stacked by subject
  const scope = chartView === 'day' ? (document.getElementById('dayPickerInput').value || todayStr()) : chartView;
  const labels = users.map(u => u.name);
  const datasets = state.subjects.map(s => ({
    label: s.name, data: users.map(u => getUserSubj(u.id, scope)[s.id] || 0),
    backgroundColor: s.color, borderRadius: 4, borderSkipped: false
  }));
  mainChart = buildChart('mainChart', labels, datasets);
  renderLegend();
}

/* Legend showing people (used by the Week/Month trend views) */
function renderPeopleLegend() {
  document.getElementById('mainLegend').innerHTML = visibleUserList().map((u, i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${userColor(i)}"></div>${escHtml(u.name)}</div>`).join('');
}

/* ── Weekly chart ──
   IMPORTANT: this graph must never include a person who has Anonymous mode on for anyone
   but themselves. Anonymous mode is meant to hide a person's numbers entirely from other
   devices — including via indirect leakage through aggregate totals. Earlier this pulled
   straight from state.history for ALL uids, which meant an anonymous person's questions were
   still baked into the "This week" totals/trend line on other devices, letting anyone infer
   their daily activity by comparing this total against the sum of the visible cards. It now
   only ever sums over visibleUserList() (the same filter used everywhere else anonymity is
   enforced), so an anonymous person's data never touches this chart on a device that isn't theirs. */
function weekVisibleDayTotal(dt, subjId) {
  const day = state.history[dt] || {};
  return visibleUserList().reduce((sum, u) => sum + ((day[u.id] || {})[subjId] || 0), 0);
}
function weekVisibleDayGrandTotal(dt) {
  const day = state.history[dt] || {};
  return visibleUserList().reduce((sum, u) => sum + state.subjects.reduce((t, s) => t + ((day[u.id] || {})[s.id] || 0), 0), 0);
}
/* "This week — per day": one grouped bar PER PERSON for each day (not everyone collapsed into a
   single collective bar), and each person's own bar is still stacked by subject so the subject
   breakdown is never lost. Chart.js groups side-by-side by distinct `stack` value and stacks
   within a shared `stack` value, so giving every (person, subject) dataset `stack: person.id`
   gets both behaviours from one chart. Anonymous people are still excluded on devices that
   aren't theirs, via visibleUserList(), same as everywhere else anonymity is enforced. */
function renderWeekChart() {
  const canvas = document.getElementById('weeklyChart');
  const msg = document.getElementById('noDataMsgW');
  const people = visibleUserList();
  if (!state.subjects.length || !people.length) { canvas.style.display = 'none'; msg.style.display = 'block'; if (weekChart) { weekChart.destroy(); weekChart = null; } document.getElementById('weekPeopleLegend').innerHTML = ''; return; }
  canvas.style.display = 'block'; msg.style.display = 'none';
  const now = logicalNow(), dow = now.getDay(), offset = dow === 0 ? -6 : 1 - dow;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const keys = [], labels = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() + offset + i);
    keys.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()));
    labels.push(dayNames[i] + ' ' + d.getDate());
  }
  const todayIdx = keys.indexOf(todayStr());
  const datasets = [];
  people.forEach(u => {
    state.subjects.forEach(s => {
      datasets.push({
        label: `${u.name} — ${s.name}`,
        data: keys.map(dt => (((state.history[dt] || {})[u.id] || {})[s.id]) || 0),
        backgroundColor: s.color, stack: u.id, borderRadius: 4, borderSkipped: false,
        barPercentage: 0.85, categoryPercentage: 0.85, order: 2
      });
    });
  });
  // Dotted average line — mean total across everyone, per day (not any single person's line)
  const trendColor = document.documentElement.dataset.theme === 'light' ? '#111112' : '#f0ede8';
  datasets.push({
    type: 'line', label: 'Avg/day',
    data: keys.map(dt => Math.round((weekVisibleDayGrandTotal(dt) / people.length) * 10) / 10),
    borderColor: trendColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0,
    tension: .35, fill: false, yAxisID: 'yLine', order: 1
  });
  if (weekChart) { weekChart.destroy(); weekChart = null; }
  weekChart = buildChart('weeklyChart', labels, datasets, todayIdx);
  document.getElementById('weekPeopleLegend').innerHTML = `Bars per day (left→right): ${people.map(u => escHtml(u.name)).join(', ')}`;
  renderWeekAvgCorner(keys);
}

/* ── "This week" corner readout — weekly avg qs solved, toggleable ──
   Cycles: Overall avg/day → per-person avg/day → per-subject avg/day. Never includes
   anonymous people's numbers on a device that isn't theirs (same visibleUserList() guard). */
let weekAvgMode = 'overall'; // 'overall' | 'person' | 'subject'
function cycleWeekAvg() {
  weekAvgMode = weekAvgMode === 'overall' ? 'person' : weekAvgMode === 'person' ? 'subject' : 'overall';
  renderWeekAvgCorner();
}
function renderWeekAvgCorner(keysIn) {
  const el = document.getElementById('weekAvgCorner');
  if (!el) return;
  const now = logicalNow(), dow = now.getDay(), offset = dow === 0 ? -6 : 1 - dow;
  const keys = keysIn || (() => {
    const ks = [];
    for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() + offset + i); ks.push(d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())); }
    return ks;
  })();
  const days = keys.length || 7;
  if (weekAvgMode === 'overall') {
    const total = keys.reduce((s, dt) => s + weekVisibleDayGrandTotal(dt), 0);
    el.innerHTML = `<span class="wk-avg-label">Avg/day</span><span class="wk-avg-val">${Math.round((total / days) * 10) / 10}</span>`;
  } else if (weekAvgMode === 'person') {
    const users = visibleUserList();
    if (!users.length) { el.innerHTML = `<span class="wk-avg-label">Avg/day</span><span class="wk-avg-val">—</span>`; }
    else {
      el.innerHTML = users.map(u => {
        const total = keys.reduce((s, dt) => s + dayTotal(u.id, dt), 0);
        return `<span class="wk-avg-chip">${escHtml(u.name)}<b>${Math.round((total / days) * 10) / 10}</b></span>`;
      }).join('');
    }
  } else {
    if (!state.subjects.length) { el.innerHTML = `<span class="wk-avg-label">Avg/day</span><span class="wk-avg-val">—</span>`; }
    else {
      el.innerHTML = state.subjects.map(s => {
        const total = keys.reduce((sum, dt) => sum + weekVisibleDayTotal(dt, s.id), 0);
        return `<span class="wk-avg-chip">${escHtml(s.name)}<b>${Math.round((total / days) * 10) / 10}</b></span>`;
      }).join('');
    }
  }
}

function buildChart(id, labels, datasets, todayIdx = -1, stackedBars = true) {
  const dark = document.documentElement.dataset.theme !== 'light';
  const gc = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tc = dark ? '#888885' : '#aaa';
  const bg = dark ? '#181819' : '#fff';
  const bc = dark ? '#2e2e32' : '#e0dedd';
  const tx = dark ? '#f0ede8' : '#1a1a1b';
  return new Chart(document.getElementById(id), {
    type: 'bar', data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: bg, borderColor: bc, borderWidth: 1,
          titleColor: tx, bodyColor: '#888885',
          titleFont: { family: 'Syne', weight: '700', size: 11 }, bodyFont: { family: 'DM Mono', size: 10 }, padding: 9,
          callbacks: { footer: items => 'Total: ' + items.reduce((s, i) => s + i.raw, 0), footerColor: tx, footerFont: { family: 'Syne', weight: '700', size: 11 } }
        }
      },
      scales: {
        x: { stacked: stackedBars, grid: { display: false }, border: { display: false }, ticks: { color: ctx => ctx.index === todayIdx ? tx : tc, font: { family: 'Syne', weight: '700', size: 10 }, maxRotation: 0, autoSkip: false } },
        y: { stacked: stackedBars, grid: { color: gc }, border: { display: false }, ticks: { color: tc, font: { family: 'DM Mono', size: 9 } }, beginAtZero: true },
        // Separate (hidden) axis so trend lines are not stacked with the bars
        yLine: { display: false, stacked: false, beginAtZero: true, grace: '8%' }
      },
      animation: { duration: 300, easing: 'easeOutCubic' }
    }
  });
}

/* Prev/next (and month-picker) navigation shown above the main chart for Week/Month views */
function renderChartNav(tl) {
  let host = document.getElementById('chartNavRow');
  if (chartView !== 'week' && chartView !== 'month') { if (host) host.style.display = 'none'; return; }
  if (!host) return;
  host.style.display = 'flex';
  if (chartView === 'week') {
    host.innerHTML = `
      <button class="cal-nav-btn" onclick="navWeek(-1)">‹</button>
      <div class="cal-month-label">${weekRangeLabel()}</div>
      <button class="cal-nav-btn" onclick="navWeek(1)" ${weekOffset === 0 ? 'disabled style="opacity:.3"' : ''}>›</button>`;
  } else {
    const months = availableMonths(); // newest first, for the dropdown
    const opts = months.map(m => {
      const [y, mo] = m.split('-').map(Number);
      const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `<option value="${m}" ${m === monthSel ? 'selected' : ''}>${MON[mo-1]} ${y}</option>`;
    }).join('');
    host.innerHTML = `
      <button class="cal-nav-btn" onclick="navMonth(-1)">‹</button>
      <select class="month-picker" onchange="pickMonth(this.value)">${opts}</select>
      <button class="cal-nav-btn" onclick="navMonth(1)">›</button>`;
  }
}

function rebuildCharts() {
  if (mainChart) { mainChart.destroy(); mainChart = null; }
  if (weekChart) { weekChart.destroy(); weekChart = null; }
  renderAll();
}

/* ── Circular graphs (all-time per person · this month per person) ── */
let donutAll = null, donutMonth = null, donutMonthSel = null;
function drawDonut(canvasId, msgId, labels, data, colors) {
  const canvas = document.getElementById(canvasId), msg = document.getElementById(msgId);
  if (!canvas || !msg) return null;
  if (!labels.length || !data.reduce((a, b) => a + b, 0)) { canvas.style.display = 'none'; msg.style.display = 'block'; return null; }
  canvas.style.display = 'block'; msg.style.display = 'none';
  const dark = document.documentElement.dataset.theme !== 'light';
  return new Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: dark ? '#181819' : '#ffffff', borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { position: 'bottom', labels: { color: dark ? '#f0ede8' : '#1a1a1b', font: { family: 'Syne', size: 10, weight: '700' }, boxWidth: 10 } } },
      animation: { duration: 300 } }
  });
}
function navDonutMonth(dir) {
  const months = availableMonths().sort();
  if (!donutMonthSel) donutMonthSel = todayStr().slice(0, 7);
  let idx = months.indexOf(donutMonthSel);
  idx = Math.min(Math.max(idx + dir, 0), months.length - 1);
  donutMonthSel = months[idx];
  renderDonuts();
}
function pickDonutMonth(v) { donutMonthSel = v; renderDonuts(); }
function renderDonuts() {
  if (donutAll) { donutAll.destroy(); donutAll = null; }
  if (donutMonth) { donutMonth.destroy(); donutMonth = null; }
  const users = visibleUserList();
  const colors = users.map((u, i) => userColor(i));
  const allData = users.map(u => state.subjects.length ? getUserTotal(u.id, 'alltime') : 0);
  donutAll = drawDonut('donutAllChart', 'donutAllMsg', users.map((u, i) => `${u.name} · ${allData[i]}`), allData, colors);
  if (!donutMonthSel) donutMonthSel = todayStr().slice(0, 7);
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const months = availableMonths();
  const nav = document.getElementById('donutMonthNav');
  if (nav) nav.innerHTML = `<button class="cal-nav-btn" onclick="navDonutMonth(-1)">‹</button>
    <select class="month-picker" onchange="pickDonutMonth(this.value)">${months.map(m => { const [y, mo] = m.split('-').map(Number); return `<option value="${m}" ${m === donutMonthSel ? 'selected' : ''}>${MON[mo - 1]} ${y}</option>`; }).join('')}</select>
    <button class="cal-nav-btn" onclick="navDonutMonth(1)">›</button>`;
  const keys = Object.keys(state.history).filter(k => k.startsWith(donutMonthSel));
  const monData = users.map(u => keys.reduce((t, k) => t + dayTotal(u.id, k), 0));
  donutMonth = drawDonut('donutMonthChart', 'donutMonthMsg', users.map((u, i) => `${u.name} · ${monData[i]}`), monData, colors);
}

/* ── Calendar ── */
function initCal() { const n = logicalNow(); calYear = n.getFullYear(); calMonth = n.getMonth(); }
function calNav(dir) { calMonth += dir; if (calMonth > 11) { calMonth = 0; calYear++; } if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }

function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent = months[calMonth] + ' ' + calYear;
  const grid = document.getElementById('calGrid');
  let html = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<div class="cal-hdr">${d}</div>`).join('');
  const first = new Date(calYear, calMonth, 1).getDay();
  const dim = new Date(calYear, calMonth + 1, 0).getDate();
  const ts = todayStr();
  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = calYear + '-' + pad(calMonth + 1) + '-' + pad(d);
    const dh = state.history[ds] || {};
    const hasData = Object.keys(dh).length > 0;
    const tot = hasData ? Object.values(dh).reduce((s, u) => s + state.subjects.reduce((ss, sub) => ss + (u[sub.id] || 0), 0), 0) : 0;
    const cls = 'cal-day' + (ds === ts ? ' today' : '') + (ds === selCalDate ? ' sel' : '') + (hasData ? ' has-data' : '');
    const dots = hasData ? state.subjects.map(s => { const v = Object.values(dh).reduce((ss, u) => ss + (u[s.id] || 0), 0); return v ? `<div class="cal-dot" style="background:${s.color}"></div>` : ''; }).join('') : '';
    html += `<div class="${cls}" onclick="selectCalDay('${ds}')"><div class="cal-num">${d}</div>${hasData ? `<div class="cal-tot">${tot}</div>` : ''}<div class="cal-dots">${dots}</div></div>`;
  }
  grid.innerHTML = html;
  if (selCalDate) renderCalDetail(selCalDate);
}

function selectCalDay(ds) {
  selCalDate = selCalDate === ds ? null : ds;
  renderCalendar();
  if (!selCalDate) document.getElementById('calDetail').style.display = 'none';
}

function renderCalDetail(ds) {
  const detail = document.getElementById('calDetail');
  const dh = state.history[ds] || {};
  const users = visibleUserList().filter(u => {
    const ud = dh[u.id] || {};
    return state.subjects.reduce((s, sub) => s + (ud[sub.id] || 0), 0) > 0;
  });
  if (!users.length) {
    detail.style.display = 'block';
    detail.innerHTML = `<div class="cal-detail"><div class="cal-dtitle">${dateLabel(ds)}</div><div class="cal-empty">No questions logged.</div></div>`;
    return;
  }
  detail.style.display = 'block';
  const rows = users.map(u => {
    const ud = dh[u.id] || {};
    const tot = state.subjects.reduce((s, sub) => s + (ud[sub.id] || 0), 0);
    const subs = state.subjects.map(s => { const v = ud[s.id] || 0; return v ? `<span style="color:${s.color}">${escHtml(s.name.slice(0, 3))}:${v}</span>` : ''; }).filter(Boolean).join('');
    return `<div class="cal-detail-row"><div class="cal-dname">${escHtml(u.name)}</div><div class="cal-dsubs">${subs || '—'}</div><div class="cal-dtot">${tot}Q</div></div>`;
  }).join('');
  detail.innerHTML = `<div class="cal-detail"><div class="cal-dtitle">${dateLabel(ds)}</div>${rows}</div>`;
}

/* ── People cards ── */
const logDatePick = {};   // per-person selected log date (defaults to today)

function renderCards() {
  const grid = document.getElementById('usersGrid');
  const users = userList();
  if (!users.length) {
    // Rebuild the empty-state node (it gets wiped whenever cards are rendered)
    grid.innerHTML = '<div class="empty-state" id="emptyGrid">No people added yet.<br>Tap <strong>+ Person</strong> in the header to begin.</div>';
    return;
  }
  const ranked = [...visibleUserList()].map(u => ({ id: u.id, score: getUserTotal(u.id, 'today') })).sort((a, b) => b.score - a.score);
  // Full rebuild every time — subjects may have changed
  grid.innerHTML = '';
  users.forEach(user => {
    const hidden = isAnonHidden(user.id);
    const mine = isAnonMine(user.id);
    if (hidden) {
      const card = document.createElement('div');
      card.className = 'user-card anon-locked-card';
      card.dataset.uid = user.id;
      card.innerHTML = `
        <div class="card-head">
          <div class="card-name-row">
            <div class="card-name">${escHtml(user.name)}</div>
            <span class="anon-badge">🕶 Anonymous</span>
          </div>
          <div class="card-actions">
            <button class="card-btn del-btn" onclick="deleteUser('${user.id}')">✕</button>
          </div>
        </div>
        <div class="anon-locked-msg">🔒 This person has anonymous mode on. Their progress is only visible on their own device.</div>`;
      grid.appendChild(card);
      return;
    }
    const logDate = (logDatePick[user.id] && logDatePick[user.id] <= todayStr()) ? logDatePick[user.id] : todayStr();
    const locked = isLocked(user.id, logDate);
    const subs = getUserSubj(user.id, 'today');
    const total = state.subjects.reduce((s, sub) => s + (subs[sub.id] || 0), 0);
    const allTot = getUserTotal(user.id, 'alltime');
    const ri = ranked.findIndex(r => r.id === user.id);
    const topScore = ranked[0]?.score || 0;
    let badge = '';
    if (ranked.length > 1 && ri >= 0) {
      badge = ri === 0
        ? `<span class="perf-badge up">▲ +${topScore - (ranked[1]?.score || 0)}</span>`
        : `<span class="perf-badge down">▼ −${topScore - (ranked[ri]?.score || 0)}</span>`;
    }
    const subRows = state.subjects.length
      ? state.subjects.map(s => `
          <div class="subj-row">
            <div class="subj-lbl" style="color:${s.color}">${escHtml(s.name)}</div>
            <div class="subj-bar-bg"><div class="subj-bar-fill" style="background:${s.color};width:${pct(subs[s.id] || 0, total)}%"></div></div>
            <div class="subj-cnt">${subs[s.id] || 0}</div>
          </div>`).join('')
      : `<div class="no-subj-msg">Tap <strong>Subjects</strong> to add your first subject.</div>`;
    const addInputs = state.subjects.map(s => `
      <div class="q-inp-grp">
        <label style="color:${s.color}">${escHtml(s.name.slice(0, 6))}</label>
        <input type="number" inputmode="numeric" id="inp_${s.id}_${user.id}" min="0" placeholder="0">
      </div>`).join('');
    const editInputs = state.subjects.map(s => `
      <div class="q-inp-grp">
        <label style="color:${s.color}">${escHtml(s.name.slice(0, 6))}</label>
        <input type="number" inputmode="numeric" id="einp_${s.id}_${user.id}" min="0" placeholder="0">
      </div>`).join('');
    const dayVals = (state.history[logDate] || {})[user.id] || {};
    const addInputsDated = state.subjects.map(s => `
      <div class="q-inp-grp">
        <label style="color:${s.color}">${escHtml(s.name.slice(0, 6))}</label>
        <input type="number" inputmode="numeric" id="inp_${s.id}_${user.id}" min="0" placeholder="0">
      </div>`).join('');
    const card = document.createElement('div');
    card.className = 'user-card' + (locked ? ' locked' : '');
    card.dataset.uid = user.id;
    card.innerHTML = `
      <div class="card-head">
        <div class="card-name-row">
          <div class="card-name">${escHtml(user.name)}</div>
          ${mine ? '<span class="anon-badge mine">🕶 Anonymous (only you)</span>' : ''}
          ${badge}
        </div>
        <div class="card-actions">
          <span class="card-today">today: ${total}</span>
          <button class="card-btn subj-btn" onclick="openSubjModal()">Subjects</button>
          ${state.subjects.length && !locked ? `<button class="card-btn edit-btn" id="editbtn_${user.id}" onclick="toggleEdit('${user.id}')">Edit</button>` : ''}
          <button class="card-btn anon-btn ${mine ? 'active' : ''}" onclick="toggleAnonymous('${user.id}')" title="Anonymous mode">🕶</button>
          <button class="card-btn del-btn" onclick="deleteUser('${user.id}')">✕</button>
        </div>
      </div>
      <div class="card-alltime">all-time: ${allTot}</div>
      <div class="subj-rows">${subRows}</div>
      ${state.subjects.length ? `
      <div class="add-qs-wrap">
        <div class="log-date-row">
          <label>Log for</label>
          <input class="log-date-inp" type="date" id="logdate_${user.id}" value="${logDate}" max="${todayStr()}" onchange="onLogDateChange('${user.id}')">
        </div>
        <div class="add-qs-label">${logDate === todayStr() ? 'Add questions done today' : 'Add questions for ' + dateLabel(logDate)} · currently ${state.subjects.reduce((t, s) => t + (dayVals[s.id] || 0), 0)}Q</div>
        <div class="q-inp-row">${addInputsDated}<button class="add-q-btn" onclick="addQuestions('${user.id}')">Add</button></div>
        ${locked ? `<div class="locked-note">This day is locked — no further changes.</div>` : ''}
      </div>
      ${locked ? '' : `
      <div class="edit-wrap" id="editwrap_${user.id}" style="display:none">
        <div class="edit-label">Correct the log for ${dateLabel(logDate)}</div>
        <div class="edit-note">Sets exact totals — overwrites that day's data for this person.</div>
        <div class="q-inp-row">${editInputs}<button class="save-edit-btn" onclick="saveEdit('${user.id}')">Save</button></div>
      </div>`}` : ''}
      <div class="card-bottom-row">
        ${locked
          ? `<span class="locked-badge locked-badge-bottom">✓ Log done</span>`
          : `<button class="done-btn done-btn-bottom" id="donebtn_${user.id}" onclick="markLogDone('${user.id}')">✓ Log done</button>`}
      </div>
      <div class="done-check" id="donecheck_${user.id}">
        <svg viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-16"/>
        </svg>
      </div>`;
    grid.appendChild(card);
  });
}

function toggleEdit(uid) {
  const wrap = document.getElementById('editwrap_' + uid);
  const btn = document.getElementById('editbtn_' + uid);
  if (!wrap) return;
  const open = wrap.style.display === 'none';
  wrap.style.display = open ? 'block' : 'none';
  if (btn) btn.classList.toggle('active', open);
  if (open) {
    const cur = (state.history[selectedLogDate(uid)] || {})[uid] || {};
    state.subjects.forEach(s => { const el = document.getElementById(`einp_${s.id}_${uid}`); if (el) el.value = cur[s.id] || ''; });
  }
}
function closeEdit(uid) {
  const wrap = document.getElementById('editwrap_' + uid);
  const btn = document.getElementById('editbtn_' + uid);
  if (wrap) wrap.style.display = 'none';
  if (btn) btn.classList.remove('active');
}

/* ── Leaderboard ── */
/* ── Leaderboard: session / global views + podium ── */
let lbView = 'session', globalLb = null, globalLbLoading = false;
const GLOBAL_KEY = 'qttrack_global_optin';
let lastGlobalSig = '';
function globalOptIn() { try { return localStorage.getItem(GLOBAL_KEY) === '1'; } catch (e) { return false; } }
function weekKeyStr() { const m = getMondayOfWeek(); return m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(m.getDate()); }
function setLbView(v, btn) {
  lbView = v;
  document.querySelectorAll('.lb-view-btn').forEach(b => b.classList.toggle('active', b === btn));
  if (v === 'global') loadGlobalLb();
  renderLeaderboard();
}
async function loadGlobalLb() {
  globalLbLoading = true; renderLeaderboard();
  try { const r = await fetch(`${FB}/global/lb.json`); const d = r.ok ? await r.json() : null; globalLb = d ? Object.values(d) : []; }
  catch (e) { globalLb = []; }
  globalLbLoading = false; renderLeaderboard();
}
function globalScore(e) {
  if (lbScope === 'today') return e.day === todayStr() ? (e.today || 0) : 0;
  if (lbScope === 'week') return e.wk === weekKeyStr() ? (e.week || 0) : 0;
  if (lbScope === 'month') return e.mo === todayStr().slice(0, 7) ? (e.month || 0) : 0;
  return e.all || 0;
}
/* What this device publishes for the people in the current session (only when opted in).
   People hidden by Anonymous mode on another device are never published; your own anonymous people go up as "Anonymous". */
function globalEntries() {
  const out = {}, day = todayStr(), wk = weekKeyStr(), mo = todayStr().slice(0, 7);
  userList().forEach(u => {
    if (isAnonHidden(u.id)) return;
    out[sessionId + '_' + u.id] = { sid: sessionId, name: isAnonMine(u.id) ? 'Anonymous' : u.name, all: getUserTotal(u.id, 'alltime'), today: getUserTotal(u.id, 'today'), week: getUserTotal(u.id, 'week'), month: getUserTotal(u.id, 'month'), day, wk, mo, ts: Date.now() };
  });
  return out;
}
async function publishGlobal(force) {
  if (!globalOptIn() || !sessionId) return;
  const ent = globalEntries();
  const sig = JSON.stringify(Object.values(ent).map(e => ({ ...e, ts: 0 })));
  if (!force && sig === lastGlobalSig) return;
  lastGlobalSig = sig;
  try {
    await Promise.all(Object.entries(ent).map(([k, v]) => fetch(`${FB}/global/lb/${k}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })));
  } catch (e) { lastGlobalSig = ''; }
}
async function unpublishGlobal() {
  await Promise.all(userList().map(u => fetch(`${FB}/global/lb/${sessionId}_${u.id}.json`, { method: 'DELETE' }).catch(() => {})));
  lastGlobalSig = '';
}
function toggleGlobalOptIn() {
  const on = !globalOptIn();
  try { localStorage.setItem(GLOBAL_KEY, on ? '1' : '0'); } catch (e) {}
  if (on) publishGlobal(true).then(() => { showToast('Published to the global board'); loadGlobalLb(); });
  else unpublishGlobal().then(() => { showToast('Removed from the global board'); loadGlobalLb(); });
  renderLeaderboard();
}
function podiumHTML(top) {
  if (!top.length || !(top[0].score > 0)) return '';
  const hs = [150, 112, 86];
  return [1, 0, 2].filter(i => top[i]).map(i =>
    `<div class="pd-col"><div class="pd-name">${escHtml(top[i].name)}</div><div class="pd-score">${top[i].score}</div><div class="pd-bar pd-${i + 1}" style="height:${hs[i]}px">${i + 1}</div></div>`).join('');
}
function renderLeaderboard() {
  const wrap = document.getElementById('lbSubjWrap'), opt = document.getElementById('lbGlobalOpt'), pod = document.getElementById('lbPodium');
  if (!wrap || !opt || !pod) return;
  if (lbView === 'session') {
    wrap.style.display = ''; opt.innerHTML = '';
    renderLeaderboardSession();
    const ranked = visibleUserList().map(u => ({ name: u.name, score: lbSubj === 'all' ? getUserTotal(u.id, lbScope) : getUserTotal(u.id, lbScope, lbSubj) })).sort((a, b) => b.score - a.score);
    pod.innerHTML = podiumHTML(ranked.slice(0, 3));
    return;
  }
  wrap.style.display = 'none';
  const on = globalOptIn();
  opt.innerHTML = `<div class="lb-opt"><div class="lb-opt-text"><b>Show my session on the global board</b><span>${on ? 'On — everyone in this session appears with their name and totals (anonymous people appear as "Anonymous").' : 'Off — nothing from this session is published.'}</span></div><button class="lb-opt-btn ${on ? 'on' : ''}" onclick="toggleGlobalOptIn()">${on ? 'Turn off' : 'Turn on'}</button></div>`;
  const table = document.getElementById('lbTable');
  if (globalLbLoading && !globalLb) { table.innerHTML = '<div class="lb-empty">Loading…</div>'; pod.innerHTML = ''; return; }
  const rows = (globalLb || []).map(e => ({ name: e.name || 'Anonymous', score: globalScore(e), mine: e.sid === sessionId })).sort((a, b) => b.score - a.score).slice(0, 100);
  pod.innerHTML = podiumHTML(rows.slice(0, 3));
  if (!rows.length) { table.innerHTML = '<div class="lb-empty">Nobody is on the global board yet. Turn sharing on above to be the first.</div>'; return; }
  const max = rows[0].score || 1, rl = ['🥇', '🥈', '🥉'], rc = ['gold', 'silver', 'bronze'];
  table.innerHTML = rows.map((u, i) => `<div class="lb-row">
      <div class="lb-rank ${rc[i] || ''}">${rl[i] || i + 1}</div>
      <div class="lb-name">${escHtml(u.name)}${u.mine ? '<span class="lb-mine">your session</span>' : ''}</div>
      <div class="lb-score-wrap"><div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${Math.round((u.score / max) * 100)}%;background:#5b8dee"></div></div><div class="lb-tot">${u.score}</div></div>
    </div>`).join('');
}

function setLbScope(s, btn) { lbScope = s; document.querySelectorAll('.lb-scope-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderLeaderboard(); }
function setLbSubj(s, btn) { lbSubj = s; document.querySelectorAll('.lb-subj-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderLeaderboard(); }
function renderLeaderboardSession() {
  const bar = document.getElementById('lbSubjBar');
  bar.innerHTML = [{ id: 'all', name: 'All', color: '' }, ...state.subjects].map(s =>
    `<button class="lb-scope-btn lb-subj-btn${s.id === lbSubj ? ' active' : ''}"
      style="${s.color && s.id === lbSubj ? `background:${s.color}20;border-color:${s.color};color:${s.color}` : ''}"
      onclick="setLbSubj('${s.id}',this)">${escHtml(s.name)}</button>`).join('');
  const table = document.getElementById('lbTable');
  const users = visibleUserList();
  if (!users.length) { table.innerHTML = '<div class="lb-empty">No people added yet.</div>'; return; }
  const ranked = [...users].map(u => ({
    ...u,
    score: lbSubj === 'all' ? getUserTotal(u.id, lbScope) : getUserTotal(u.id, lbScope, lbSubj),
    subs: getUserSubj(u.id, lbScope)
  })).sort((a, b) => b.score - a.score);
  const maxScore = ranked[0]?.score || 1;
  const rl = ['🥇','🥈','🥉'], rc = ['gold','silver','bronze'];
  const barColor = lbSubj !== 'all' ? (state.subjects.find(s => s.id === lbSubj)?.color || '#5b8dee') : '#5b8dee';
  table.innerHTML = ranked.map((u, i) => {
    const sp = state.subjects.map(s => `<span style="color:${s.color}">${escHtml(s.name.slice(0,3))}:${u.subs[s.id]||0}</span>`).join('');
    return `<div class="lb-row">
      <div class="lb-rank ${rc[i]||''}">${rl[i]||i+1}</div>
      <div class="lb-name">${escHtml(u.name)}</div>
      <div class="lb-subs">${sp}</div>
      <div class="lb-score-wrap">
        <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${Math.round((u.score/maxScore)*100)}%;background:${barColor}"></div></div>
        <div class="lb-tot">${u.score}</div>
      </div>
    </div>`;
  }).join('');
}

/* ════════════════════════════════════════════════════════════
   UI HELPERS
════════════════════════════════════════════════════════════ */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function setSyncStatus(state) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  const c = { ok: '#4ecba4', saving: '#5b8dee', loading: '#5b8dee', error: '#e8724a' };
  const l = { ok: 'Synced', saving: 'Saving…', loading: 'Loading…', error: 'Offline' };
  if (dot) dot.style.background = c[state] || '#888';
  if (lbl) lbl.textContent = l[state] || '';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  try { localStorage.setItem('qttrack_theme', next); } catch (e) {}
  rebuildCharts();
}

function loadTheme() {
  try { const t = localStorage.getItem('qttrack_theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

/* ── Page addresses ──
   Every section has its own URL (e.g. /question-tracker, /exam-analytics), so refreshing, sharing, bookmarking
   and the browser's back/forward buttons all keep you on the right section. Needs vercel.json (rewrites to index.html). */
const ROUTES = {
  homePage:        ['question-tracker',          'homeNav',        'Question Tracker'],
  studyPage:       ['study-tracker',             'studyNav',       'Study Tracker'],
  syllabusPage:    ['syllabus-tracker',          'syllabusNav',    'Syllabus Tracker'],
  revisionPage:    ['revision-planner',          'revisionNav',    'Revision Planner'],
  examPage:        ['exam-analytics',            'examNav',        'Exam Analytics'],
  breakdownPage:   ['paper-in-depth-breakdown',  'breakdownNav',   'Paper In-Depth Breakdown'],
  leaderboardPage: ['leaderboard',               'leaderboardNav', 'Leaderboard'],
  aboutPage:       ['about',                     'aboutNav',       'About'],
  changelogPage:   ['update-log',                'changelogNav',   'Update Log'],
};
const SLUG2PAGE = Object.fromEntries(Object.entries(ROUTES).map(([p, r]) => [r[0], p]));
const pathSlug = () => location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
let routing = false;   // true while the page is being set FROM the address (so we don't push a second history entry)
function pushRoute(pageId) {
  const r = ROUTES[pageId];
  if (!r || pathSlug() === r[0] || !window.history || !history.pushState) return;
  try { history.pushState({ page: pageId }, '', '/' + r[0]); } catch (e) { /* e.g. opened from a local file: keep working without a URL */ }
}
function showFromUrl() {   // returns true if the address named a known section
  const pageId = SLUG2PAGE[pathSlug()];
  if (!pageId) return false;
  routing = true; try { showPage(pageId, ROUTES[pageId][1]); } finally { routing = false; }
  return true;
}
window.addEventListener('popstate', () => {   // browser back / forward
  if (showFromUrl()) return;
  routing = true; try { showPage('homePage', 'homeNav'); } finally { routing = false; }
});

function showPage(pageId, navId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.getElementById(navId).classList.add('active');
  closeSidebar();
  const rt = ROUTES[pageId]; if (rt) { document.title = rt[2] + ' · QTrack'; if (!routing) pushRoute(pageId); }
  // Leaving Exam Analytics always re-locks: any auth for this viewing session is dropped the
  // instant you navigate away, so coming back (even to the same person) demands the password again.
  if (pageId !== 'examPage') { examAuthedUid = null; examAuthedCompareUid = null; }
  if (pageId === 'leaderboardPage') { renderLeaderboard(); if (lbView === 'global') loadGlobalLb(); }
  if (pageId === 'studyPage') renderStudyPage();
  if (pageId === 'examPage') renderExamPage();
  if (pageId === 'syllabusPage') renderSyllabusPage();
  if (pageId === 'revisionPage') renderRevisionPage();
  if (pageId === 'breakdownPage') { if (window.bdOpen) bdOpen(); else if (window.bdRender) bdRender(); }
}

/* ── Daily motivational quote ──
   A small curated bank of real Hindi + English motivational/educational quotes, shown as
   a bilingual pair and rotated deterministically by the date (same quote all day, for
   everyone, changes at midnight) rather than fetched from a live third-party API — a public
   quote API has no reliable Hindi source and would need a translation key to pair the two
   reliably, so a curated bank is the more dependable "from the internet" alternative. */
const DAILY_QUOTES = [
  { en: "The expert in anything was once a beginner.", hi: "हर विशेषज्ञ भी कभी एक शुरुआती था।" },
  { en: "Small steps every day lead to big results.", hi: "हर दिन के छोटे कदम बड़े नतीजों की ओर ले जाते हैं।" },
  { en: "Success is the sum of small efforts, repeated day in and day out.", hi: "सफलता छोटे-छोटे प्रयासों का योग है, जो रोज़ दोहराए जाते हैं।" },
  { en: "Don't watch the clock; do what it does — keep going.", hi: "घड़ी को मत देखो; वही करो जो वह करती है — चलते रहो।" },
  { en: "Discipline is choosing between what you want now and what you want most.", hi: "अनुशासन का मतलब है अभी क्या चाहिए और सबसे ज़्यादा क्या चाहिए, इसके बीच चुनना।" },
  { en: "Hard work beats talent when talent doesn't work hard.", hi: "जब प्रतिभा मेहनत नहीं करती, तो मेहनत प्रतिभा को हरा देती है।" },
  { en: "The pain of discipline weighs ounces; the pain of regret weighs tons.", hi: "अनुशासन का कष्ट हल्का होता है; पछतावे का कष्ट बहुत भारी होता है।" },
  { en: "You don't have to be great to start, but you have to start to be great.", hi: "शुरुआत करने के लिए महान होना ज़रूरी नहीं, पर महान बनने के लिए शुरुआत ज़रूरी है।" },
  { en: "Focus on progress, not perfection.", hi: "पूर्णता पर नहीं, प्रगति पर ध्यान दो।" },
  { en: "A little progress each day adds up to big results.", hi: "हर दिन की थोड़ी प्रगति मिलकर बड़ा परिणाम बनाती है।" },
  { en: "Believe you can, and you're halfway there.", hi: "विश्वास करो कि तुम कर सकते हो, आधा काम वहीं पूरा हो जाता है।" },
  { en: "Well begun is half done.", hi: "अच्छी शुरुआत आधा काम है।" },
  { en: "Knowledge is the only treasure that increases by sharing.", hi: "ज्ञान ही एकमात्र ऐसा धन है जो बाँटने से बढ़ता है।" },
  { en: "Consistency is what transforms average into excellence.", hi: "निरंतरता ही औसत को उत्कृष्टता में बदलती है।" },
  { en: "Today's hard work is tomorrow's ease.", hi: "आज की मेहनत, कल का आराम है।" },
  { en: "Fall seven times, stand up eight.", hi: "सात बार गिरो, आठवीं बार उठ खड़े हो।" },
  { en: "The best way to predict your future is to create it.", hi: "अपने भविष्य को जानने का सबसे अच्छा तरीका है उसे खुद बनाना।" },
  { en: "Push yourself, because no one else is going to do it for you.", hi: "खुद को आगे बढ़ाओ, क्योंकि यह काम तुम्हारे लिए कोई और नहीं करेगा।" },
  { en: "There are no shortcuts to any place worth going.", hi: "जो मंज़िल पाने लायक है, वहाँ कोई शॉर्टकट नहीं होता।" },
  { en: "Your only limit is the one you set for yourself.", hi: "तुम्हारी सीमा वही है, जो तुम खुद तय करते हो।" }
];
function dayOfYear(d) { const start = new Date(d.getFullYear(), 0, 0); const diff = d - start; return Math.floor(diff / 86400000); }
function renderDailyQuote() {
  const el = document.getElementById('dailyQuoteText');
  if (!el) return;
  const q = DAILY_QUOTES[dayOfYear(logicalNow()) % DAILY_QUOTES.length];
  el.innerHTML = `“${escHtml(q.en)}”<br>“${escHtml(q.hi)}”`;
}

/* ── Terms & Conditions standalone page ── */
function openTermsPage() {
  document.getElementById('termsPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}
function closeTermsPage() {
  document.getElementById('termsPage').classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Customise (Question Tracker page colour only) ──
   Applies a hue-rotate + saturation filter scoped to #homePage only, so every other
   page (Study/Syllabus/Exam/Leaderboard/About) keeps the original look. Persisted
   per-device via localStorage so it survives refresh, but never syncs to Firebase —
   it's a personal display preference, not shared session data. */
const CUSTOMISE_SWATCHES = [
  { name: 'Default', hue: 0, sat: 1 },
  { name: 'Pink', hex: '#ff5ca8' },
  { name: 'Red', hex: '#ff5c5c' },
  { name: 'Orange', hex: '#ff9c4a' },
  { name: 'Green', hex: '#4ad991' },
  { name: 'Teal', hex: '#3ecbc9' },
  { name: 'Blue', hex: '#4a9dff' },
  { name: 'Purple', hex: '#a05cff' }
];
const CUSTOMISE_BASE_HUE = 250; // approx hue of the app's default violet accent

function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return h;
}

function applyCustomTint(hex) {
  const hue = hexToHue(hex);
  const deg = hue - CUSTOMISE_BASE_HUE;
  const home = document.getElementById('homePage');
  if (home) home.style.filter = `hue-rotate(${deg}deg) saturate(1.15)`;
  try { localStorage.setItem('qttrack_tint_hex', hex); } catch (e) {}
}
function resetCustomTint() {
  const home = document.getElementById('homePage');
  if (home) home.style.filter = '';
  try { localStorage.removeItem('qttrack_tint_hex'); } catch (e) {}
  const inp = document.getElementById('customiseColorInput');
  if (inp) inp.value = '#7c5cff';
  showToast('Question Tracker colours reset');
}
function loadCustomTint() {
  let hex;
  try { hex = localStorage.getItem('qttrack_tint_hex'); } catch (e) {}
  if (hex) applyCustomTint(hex);
  const inp = document.getElementById('customiseColorInput');
  if (inp && hex) inp.value = hex;
}
function renderCustomiseSwatches() {
  const host = document.getElementById('customiseSwatchRow');
  if (!host) return;
  host.innerHTML = CUSTOMISE_SWATCHES.map(s => {
    if (s.hex) return `<button class="customise-swatch" style="background:${s.hex}" title="${s.name}" onclick="applyCustomTint('${s.hex}')"></button>`;
    return `<button class="customise-swatch default-swatch" title="${s.name}" onclick="resetCustomTint()">↺</button>`;
  }).join('');
}

function toggleFaq(el) { el.classList.toggle('open'); }
function setAboutSubtab(tab) {
  document.getElementById('aboutGeneralTab').style.display = tab === 'general' ? 'block' : 'none';
  document.getElementById('aboutSyllabusTab').style.display = tab === 'syllabus' ? 'block' : 'none';
  document.getElementById('aboutSubtab_general').classList.toggle('active', tab === 'general');
  document.getElementById('aboutSubtab_syllabus').classList.toggle('active', tab === 'syllabus');
}

async function submitFeedback() {
  if (!window._starRating) { showToast('Please select a rating'); return; }
  const msg = document.getElementById('feedbackText').value.trim();
  const ts = Date.now();
  const payload = { rating: window._starRating, message: msg, version: VERSION, session: sessionId, time: ts };
  try {
    const res = await fetch(`${FB}/feedbacks/${ts}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.text(); console.error('Feedback failed:', res.status, err); showToast('Failed to send'); return; }
    showToast('Feedback sent — thank you!');
  } catch (e) { console.error('Feedback error:', e); showToast('Failed to send'); return; }
  closeModal('feedbackModal');
  document.getElementById('feedbackText').value = '';
  window._starRating = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('lit'));
}

async function submitBug() {
  const msg = document.getElementById('bugText').value.trim();
  if (!msg) { showToast('Please describe the bug'); return; }
  const ts = Date.now();
  const payload = { message: msg, version: VERSION, session: sessionId, userAgent: navigator.userAgent, time: ts };
  try {
    const res = await fetch(`${FB}/bugs/${ts}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.text(); console.error('Bug report failed:', res.status, err); showToast('Failed to send'); return; }
    showToast('Bug report sent — thank you!');
  } catch (e) { console.error('Bug report error:', e); showToast('Failed to send'); return; }
  closeModal('bugModal');
  document.getElementById('bugText').value = '';
}

function setRating(n) {
  window._starRating = n;
  document.querySelectorAll('.star-btn').forEach((b, i) => b.classList.toggle('lit', i < n));
}

function checkFirstVisit() {
  try {
    if (!localStorage.getItem('qttrack_visited')) {
      const hint = document.getElementById('firstHint');
      if (hint) {
        hint.classList.add('show');
        setTimeout(() => hint.classList.remove('show'), 6000);
      }
    }
  } catch (e) {}
}
function dismissHint() {
  const hint = document.getElementById('firstHint');
  if (hint) hint.classList.remove('show');
  try { localStorage.setItem('qttrack_visited', '1'); } catch (e) {}
}

function initDevWarning() {
  const w = document.getElementById('devWarning');
  if (!w) return;
  try {
    if (localStorage.getItem('qttrack_dev_warning_dismissed') === '1') {
      w.classList.add('hidden');
    }
  } catch (e) {}
  const btn = document.getElementById('devWarningClose');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      w.classList.add('hidden');
      try { localStorage.setItem('qttrack_dev_warning_dismissed', '1'); } catch (err) {}
    });
  }
}
function dismissDevWarning() {
  const w = document.getElementById('devWarning');
  if (w) w.classList.add('hidden');
  try { localStorage.setItem('qttrack_dev_warning_dismissed', '1'); } catch (e) {}
}

