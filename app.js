/* ═══════════════════════════════════════════════════════════════
   QTrack 0.5.0 — app.js
   Architecture: Firebase REST, write-then-read, no polling conflicts
═══════════════════════════════════════════════════════════════ */

const FB = 'https://qtrack-d4724-default-rtdb.firebaseio.com';
const VERSION = '0.9.1';

/* ════════════════════════════════════════════════════════════
   SYLLABUS TRACKER — reference data (JEE / NEET) + broad units
   tier: A=3.0x B=2.0x C=1.5x D=1.0x  (mapped from source P1–P4)
   status values: pending=0, theory=0.5, pyq=1, mastered=1 (visual only)
════════════════════════════════════════════════════════════ */
const PRIORITY_WEIGHT = { A: 3.0, Adv: 2.5, B: 2.0, C: 1.5, D: 1.0 };
const STATUS_VALUE = { pending: 0, theory: 0.5, pyq: 1, mastered: 1 };
const STATUS_LABEL = { pending: 'Pending', theory: 'Theory', pyq: '+PYQs', mastered: 'Mastered' };

function mkCh(name, tier, unit, cls) { return { name, tier, unit, cls }; }

const SYLLABUS_DATA = {
  jee: {
    physics: { name: 'Physics', chapters: [
      mkCh('Modern Physics & Semiconductor Electronics','A','Modern Physics','12th'),
      mkCh('Current Electricity','A','Electrostatics and current dynamics','12th'),
      mkCh('Electrostatics & Capacitance','A','Electrostatics and current dynamics','12th'),
      mkCh('Magnetic Effects of Current & Magnetism','A','Magnetism','12th'),
      mkCh('Electromagnetic Induction & AC','A','EM Waves and Alternating Current','12th'),
      mkCh('Ray + Wave Optics','A','Optics','12th'),
      mkCh('Rotational Motion','A','Mechanics','11th'),
      mkCh('Work, Energy & Power','A','Mechanics','11th'),
      mkCh("Newton's Laws & Friction",'B','Mechanics','11th'),
      mkCh('Kinematics','B','Mechanics','11th'),
      mkCh('Simple Harmonic Motion','B','Oscillations & Waves','11th'),
      mkCh('Waves & Sound','B','Oscillations & Waves','11th'),
      mkCh('Thermodynamics & Kinetic Theory','B','Thermal Physics','11th'),
      mkCh('Gravitation','B','Mechanics','11th'),
      mkCh('Fluids','B','Mechanics','11th'),
      mkCh('Centre of Mass, Momentum & Collisions','C','Mechanics','11th'),
      mkCh('Mechanical Properties of Solids','C','Mechanics','11th'),
      mkCh('Thermal Properties of Matter','C','Thermal Physics','11th'),
      mkCh('Units, Dimensions & Errors','C','Experimental Physics','11th'),
      mkCh('Experimental Physics','C','Experimental Physics','Both'),
      mkCh('Communication / EM Waves','D','EM Waves and Alternating Current','12th'),
      mkCh('Basic Mathematics for Physics','D','Experimental Physics','11th')
    ]},
    chemistry: { name: 'Chemistry', chapters: [
      mkCh('Chemical Bonding & Molecular Structure','A','Inorganic Chemistry','11th'),
      mkCh('Coordination Compounds','A','Inorganic Chemistry','12th'),
      mkCh('General Organic Chemistry (GOC) + Isomerism','A','Organic Chemistry','11th'),
      mkCh('Aldehydes, Ketones & Carboxylic Acids','A','Organic Chemistry','12th'),
      mkCh('Amines','A','Organic Chemistry','12th'),
      mkCh('Electrochemistry','A','Physical Chemistry','12th'),
      mkCh('Chemical Kinetics','A','Physical Chemistry','12th'),
      mkCh('Thermodynamics & Thermochemistry','A','Physical Chemistry','11th'),
      mkCh('Mole Concept & Stoichiometry','B','Physical Chemistry','11th'),
      mkCh('Atomic Structure','B','Physical Chemistry','11th'),
      mkCh('Chemical & Ionic Equilibrium','B','Physical Chemistry','11th'),
      mkCh('Periodic Table & Periodicity','B','Inorganic Chemistry','11th'),
      mkCh('p-Block Elements','B','Inorganic Chemistry','Both'),
      mkCh('d- and f-Block Elements','B','Inorganic Chemistry','12th'),
      mkCh('Alcohols, Phenols & Ethers','B','Organic Chemistry','12th'),
      mkCh('Hydrocarbons','B','Organic Chemistry','11th'),
      mkCh('Solutions','C','Physical Chemistry','12th'),
      mkCh('States of Matter','C','Physical Chemistry','11th'),
      mkCh('Redox Reactions','C','Physical Chemistry','11th'),
      mkCh('Haloalkanes & Haloarenes','C','Organic Chemistry','12th'),
      mkCh('Biomolecules','C','Organic Chemistry','12th'),
      mkCh('Practical/Qualitative Chemistry','C','Inorganic Chemistry','Both'),
      mkCh('Metallurgy','C','Inorganic Chemistry','12th'),
      mkCh('Solid State','D','Physical Chemistry','12th'),
      mkCh('Surface Chemistry','D','Physical Chemistry','12th'),
      mkCh('Polymers & Chemistry in Everyday Life','D','Organic Chemistry','12th'),
      mkCh('Environmental Chemistry','D','Physical Chemistry','11th')
    ]},
    maths: { name: 'Mathematics', chapters: [
      mkCh('Limits, Continuity & Differentiability','A','Calculus','12th'),
      mkCh('Application of Derivatives','A','Calculus','12th'),
      mkCh('Indefinite Integration','A','Calculus','12th'),
      mkCh('Definite Integration & Area','A','Calculus','12th'),
      mkCh('Matrices & Determinants','A','Algebra','12th'),
      mkCh('Coordinate Geometry: Straight Line & Circle','A','Coordinate Geometry','11th'),
      mkCh('Conic Sections','A','Coordinate Geometry','11th'),
      mkCh('Probability','A','Algebra','12th'),
      mkCh('Complex Numbers & Quadratic Equations','B','Algebra','11th'),
      mkCh('Sequence & Series','B','Algebra','11th'),
      mkCh('Differential Equations','B','Calculus','12th'),
      mkCh('Vector Algebra','B','Vector & 3D Geometry','12th'),
      mkCh('3D Geometry','B','Vector & 3D Geometry','12th'),
      mkCh('Trigonometry & Inverse Trigonometry','B','Trigonometry','11th'),
      mkCh('Binomial Theorem','B','Algebra','11th'),
      mkCh('Functions','C','Sets, Relations & Functions','11th'),
      mkCh('Sets & Relations','C','Sets, Relations & Functions','11th'),
      mkCh('Permutations & Combinations','C','Algebra','11th'),
      mkCh('Mathematical Reasoning','C','Sets, Relations & Functions','12th'),
      mkCh('Statistics','C','Algebra','11th'),
      mkCh('Linear Programming','C','Algebra','12th'),
      mkCh('Mathematical Induction','D','Algebra','11th'),
      mkCh('Basic Algebra & Inequalities','D','Algebra','11th')
    ]}
  },
  neet: {
    physics: { name: 'Physics', chapters: [
      mkCh('Modern Physics','A','Modern Physics','12th'),
      mkCh('Current Electricity','A','Electrostatics and current dynamics','12th'),
      mkCh('Electrostatics & Capacitance','A','Electrostatics and current dynamics','12th'),
      mkCh('Magnetic Effects & Magnetism','A','Magnetism','12th'),
      mkCh('EMI & Alternating Current','A','EM Waves and Alternating Current','12th'),
      mkCh('Ray & Wave Optics','A','Optics','12th'),
      mkCh('Semiconductor Electronics','A','Modern Physics','12th'),
      mkCh('Laws of Motion & Friction','B','Mechanics','11th'),
      mkCh('Work, Energy & Power','B','Mechanics','11th'),
      mkCh('Rotational Motion','B','Mechanics','11th'),
      mkCh('Thermodynamics','B','Thermal Physics','11th'),
      mkCh('SHM & Waves','B','Oscillations & Waves','11th'),
      mkCh('Kinematics','B','Mechanics','11th'),
      mkCh('Gravitation','B','Mechanics','11th'),
      mkCh('Properties of Matter','C','Mechanics','11th'),
      mkCh('Thermal Properties & Kinetic Theory','C','Thermal Physics','11th'),
      mkCh('Experimental Physics & Measurement','C','Experimental Physics','11th'),
      mkCh('Electromagnetic Waves','C','EM Waves and Alternating Current','12th')
    ]},
    chemistry: { name: 'Chemistry', chapters: [
      mkCh('Chemical Bonding','A','Inorganic Chemistry','11th'),
      mkCh('General Organic Chemistry + Isomerism','A','Organic Chemistry','11th'),
      mkCh('Coordination Compounds','A','Inorganic Chemistry','12th'),
      mkCh('Thermodynamics','A','Physical Chemistry','11th'),
      mkCh('Chemical Equilibrium','A','Physical Chemistry','11th'),
      mkCh('Ionic Equilibrium','A','Physical Chemistry','11th'),
      mkCh('Electrochemistry','A','Physical Chemistry','12th'),
      mkCh('Chemical Kinetics','A','Physical Chemistry','12th'),
      mkCh('Mole Concept & Redox','B','Physical Chemistry','11th'),
      mkCh('Atomic Structure','B','Physical Chemistry','11th'),
      mkCh('Periodic Classification','B','Inorganic Chemistry','11th'),
      mkCh('p-Block','B','Inorganic Chemistry','Both'),
      mkCh('d- and f-Block','B','Inorganic Chemistry','12th'),
      mkCh('Hydrocarbons','B','Organic Chemistry','11th'),
      mkCh('Haloalkanes & Haloarenes','B','Organic Chemistry','12th'),
      mkCh('Alcohols, Phenols & Ethers','B','Organic Chemistry','12th'),
      mkCh('Aldehydes, Ketones & Carboxylic Acids','B','Organic Chemistry','12th'),
      mkCh('Amines','B','Organic Chemistry','12th'),
      mkCh('Solutions','C','Physical Chemistry','12th'),
      mkCh('States of Matter','C','Physical Chemistry','11th'),
      mkCh('Biomolecules','C','Organic Chemistry','12th'),
      mkCh('Practical Chemistry','C','Inorganic Chemistry','Both'),
      mkCh('Metallurgy','C','Inorganic Chemistry','12th'),
      mkCh('Solid State','C','Physical Chemistry','12th'),
      mkCh('Surface Chemistry','C','Physical Chemistry','12th')
    ]},
    biology: { name: 'Biology', chapters: [
      mkCh('Human Physiology','A','Human Physiology','11th'),
      mkCh('Molecular Basis of Inheritance','A','Genetics & Evolution','12th'),
      mkCh('Principles of Inheritance & Variation','A','Genetics & Evolution','12th'),
      mkCh('Human Reproduction','A','Reproduction','12th'),
      mkCh('Sexual Reproduction in Flowering Plants','A','Reproduction','12th'),
      mkCh('Cell: Structure & Function','A','Cell Biology','11th'),
      mkCh('Biomolecules','A','Cell Biology','11th'),
      mkCh('Biotechnology: Principles & Processes + Applications','A','Biotechnology','12th'),
      mkCh('Ecology: Ecosystem & Biodiversity','A','Ecology','12th'),
      mkCh('Cell Cycle & Cell Division','B','Cell Biology','11th'),
      mkCh('Evolution','B','Genetics & Evolution','12th'),
      mkCh('Reproductive Health','B','Reproduction','12th'),
      mkCh('Microbes in Human Welfare','B','Biology & Human Welfare','12th'),
      mkCh('Organisms & Populations','B','Ecology','12th'),
      mkCh('Environmental Issues','B','Ecology','12th'),
      mkCh('Plant Kingdom','B','Diversity','11th'),
      mkCh('Animal Kingdom','B','Diversity','11th'),
      mkCh('Morphology of Flowering Plants','C','Structural Organisation','11th'),
      mkCh('Anatomy of Flowering Plants','C','Structural Organisation','11th'),
      mkCh('Transport in Plants','C','Plant Physiology','11th'),
      mkCh('Photosynthesis in Plants','C','Plant Physiology','11th'),
      mkCh('Respiration in Plants','C','Plant Physiology','11th'),
      mkCh('Plant Growth & Development','C','Plant Physiology','11th'),
      mkCh('Structural Organisation in Animals','C','Structural Organisation','11th'),
      mkCh('Neural Control & Chemical Coordination','C','Human Physiology','12th')
    ]}
  }
};

/* Broad "unit" categories per subject family — used for Unit view grouping
   and for the Exam Analytics test-analysis survey. */
const BROAD_UNITS = {
  physics: ['Mechanics','Oscillations & Waves','Thermal Physics','Electrostatics and current dynamics','Magnetism','EM Waves and Alternating Current','Optics','Modern Physics','Experimental Physics'],
  chemistry: ['Physical Chemistry','Organic Chemistry','Inorganic Chemistry'],
  maths: ['Algebra','Calculus','Coordinate Geometry','Vector & 3D Geometry','Trigonometry','Sets, Relations & Functions'],
  biology: ['Diversity','Structural Organisation','Cell Biology','Plant Physiology','Human Physiology','Reproduction','Genetics & Evolution','Biology & Human Welfare','Biotechnology','Ecology']
};

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
  if (!state.exams.tests) state.exams.tests = {};
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
  if (!users.length) { inner.innerHTML = '<span style="color:var(--muted)">—</span>'; return; }
  const ranked = [...users].map(u => ({ ...u, score: getUserTotal(u.id, 'alltime') })).sort((a, b) => b.score - a.score);
  const lead = ranked[1] ? ranked[0].score - ranked[1].score : ranked[0].score;
  inner.innerHTML = `<span class="tp-name">${escHtml(ranked[0].name)}</span>${lead > 0 ? `<span class="tp-lead">▲${lead}</span>` : ''}`;
  renderAllTimeDrop(ranked);
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
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', (e) => {
  const drop = document.getElementById('allTimeDropdown');
  const btn = document.getElementById('allTimeDropBtn');
  if (drop && drop.style.display === 'block' && !drop.contains(e.target) && e.target !== btn) drop.style.display = 'none';
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

/* ── Weekly chart ── */
function renderWeekChart() {
  const canvas = document.getElementById('weeklyChart');
  const msg = document.getElementById('noDataMsgW');
  if (!state.subjects.length) { canvas.style.display = 'none'; msg.style.display = 'block'; if (weekChart) { weekChart.destroy(); weekChart = null; } return; }
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
  const datasets = state.subjects.map(s => ({
    label: s.name,
    data: keys.map(dt => Object.values(state.history[dt] || {}).reduce((sum, u) => sum + (u[s.id] || 0), 0)),
    backgroundColor: s.color, borderRadius: 4, borderSkipped: false, order: 2
  }));
  // Trend line over the bars — total questions per day
  const trendColor = document.documentElement.dataset.theme === 'light' ? '#111112' : '#f0ede8';
  datasets.push({
    type: 'line', label: 'Trend',
    data: keys.map(dt => Object.values(state.history[dt] || {}).reduce((sum, u) => sum + state.subjects.reduce((t, s) => t + (u[s.id] || 0), 0), 0)),
    borderColor: trendColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0,
    tension: .35, fill: false, yAxisID: 'yLine', order: 1
  });
  if (weekChart) { weekChart.destroy(); weekChart = null; }
  weekChart = buildChart('weeklyChart', labels, datasets, todayIdx);
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
function setLbScope(s, btn) { lbScope = s; document.querySelectorAll('.lb-scope-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderLeaderboard(); }
function setLbSubj(s, btn) { lbSubj = s; document.querySelectorAll('.lb-subj-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderLeaderboard(); }
function renderLeaderboard() {
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

function showPage(pageId, navId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.getElementById(navId).classList.add('active');
  closeSidebar();
  if (pageId === 'leaderboardPage') renderLeaderboard();
  if (pageId === 'studyPage') renderStudyPage();
  if (pageId === 'examPage') renderExamPage();
  if (pageId === 'syllabusPage') renderSyllabusPage();
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

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return String(h);
}
function examUnlockedList() { try { return JSON.parse(localStorage.getItem('qttrack_exam_unlocked') || '[]'); } catch (e) { return []; } }
function examUnlockedHas(uid) { return examUnlockedList().includes(uid); }
function examUnlockedAdd(uid) { const l = examUnlockedList(); if (!l.includes(uid)) { l.push(uid); localStorage.setItem('qttrack_exam_unlocked', JSON.stringify(l)); } }

function examSubjFamily(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('phys')) return 'physics';
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
  const tests = examTestsForMode();
  renderExamOverview(tests);
  renderExamTestsGrid(tests);
  renderExamCharts(tests); // always visible now — no toggle
  const cbtn = document.getElementById('examCompareToggleBtn');
  const cblock = document.getElementById('examCompareBlock');
  if (cbtn) cbtn.classList.toggle('active', examCompareOpen);
  if (cblock) cblock.style.display = examCompareOpen ? 'block' : 'none';
  if (examCompareOpen) renderExamCompare();
}

function toggleExamCompare() {
  examCompareOpen = !examCompareOpen;
  renderExamPage();
}

/* Compare against another person — password-gated if they've locked their Exam Analytics */
function examSelectCompareUser(uid) {
  if (uid === examCompareUid) return;
  const locked = state.exams.locks[uid];
  if (locked && !examUnlockedHas(uid)) {
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

/* Grid of larger, colour-graded test cards — main score circle on the left, Phy/Chem/Maths circles to the right */
function renderExamTestsGrid(tests) {
  const host = document.getElementById('examTestsGrid');
  if (!host) return;
  if (!tests.length) { host.innerHTML = '<div class="exam-empty">No tests logged in this mode yet. Tap <strong>+ Add Test</strong> to log your first one.</div>'; return; }
  const famOrder = [['physics', 'PHY'], ['chemistry', 'CHEM'], ['maths', 'MATHS']];
  host.innerHTML = [...tests].reverse().map(t => {
    const badge = examJmJa(t);
    const circleColor = examScoreColor(t.obtainedMarks, t.totalMarks || 1);
    const bySubj = {};
    (t.subjects || []).forEach(s => { const f = examSubjFamily(s.name); if (f) bySubj[f] = s; });
    const percentile = t.overallPercentile != null ? t.overallPercentile : examCalcPercentile(t.overallRank, t.totalStudents);
    const diffClass = t.difficulty || '';
    return `
    <div class="exam-test-card">
      <div class="exam-test-card-top">
        <div>
          <div class="exam-test-card-name">${escHtml(t.name)}</div>
          <div class="exam-test-card-date">${t.date ? dateLabel(t.date) : ''}</div>
        </div>
        ${badge ? `<span class="exam-jmja-badge ${badge.toLowerCase()}">${badge}</span>` : ''}
      </div>
      <div class="exam-score-row">
        <div class="exam-score-circle main" style="background:${circleColor}">${t.obtainedMarks ?? 0}<br><span style="font-size:.8em">/${t.totalMarks ?? 0}</span></div>
        <div class="exam-subj-circles">
          ${famOrder.map(([fam, lbl]) => {
            const s = bySubj[fam];
            const col = s ? examSubjScoreColor(fam, s.score, s.max || 100) : 'var(--ex-surface2)';
            return `<div class="exam-subj-circle-wrap">
              <div class="exam-subj-circle" style="background:${col}">${s ? (s.score ?? '—') : '—'}</div>
              <div class="exam-subj-circle-name">${lbl}</div>
              ${t.difficulty ? `<div class="exam-subj-diff ${diffClass}">${t.difficulty}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="exam-test-stats">
        <div>Rank: <b>${t.overallRank ?? '—'}</b> of <b>${t.totalStudents ?? '—'}</b> candidates</div>
        <div>Percentile: <b>${percentile != null ? percentile + '%' : '—'}</b></div>
      </div>
      ${t.note ? `<div class="exam-note-box" style="font-size:.62rem;padding:.4rem .5rem">${escHtml(t.note)}</div>` : ''}
      <div class="exam-test-card-actions">
        <button class="exam-icon-btn" onclick="openExamModal('${t.id}')">Edit</button>
        <button class="exam-icon-btn" onclick="openExamAnalysisFor('${t.id}')">Paper Analysis</button>
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

function selectExamUser(uid) {
  if (uid === examUid) return;
  const locked = state.exams.locks[uid];
  if (locked && !examUnlockedHas(uid)) {
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
  const pw = document.getElementById('examPassEnterInput').value;
  const locked = state.exams.locks[examPendingUid];
  if (locked && simpleHash(pw) === locked.hash) {
    examUnlockedAdd(examPendingUid);
    closeModal('examPassEnterModal');
    if (examPassEnterMode === 'compare') {
      examCompareUid = examPendingUid;
    } else {
      examUid = examPendingUid; examSelTestId = null; examWebSubj = null;
    }
    renderExamPage();
  } else {
    showToast('Incorrect password');
  }
}

function openExamPassSet() {
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
  doWrite(() => fbPut('/exams/locks/' + examUid, { hash: simpleHash(pw) }))
    .then(ok => { if (ok) { examUnlockedAdd(examUid); showToast('Password set'); } });
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
    rows.push(`<div style="margin-bottom:.3rem"><strong>${escHtml(subj)}:</strong> most emphasized — ${escHtml(most)} (${units[most].attempted || 0}%) · least — ${escHtml(least)} (${units[least].attempted || 0}%)</div>`);
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
  const test = {
    id, mode: examMode, name, ownerUid: examUid,
    date: document.getElementById('examTestDate').value || todayStr(),
    totalMarks: Number(document.getElementById('examTotalMarks').value) || 0,
    obtainedMarks: Number(document.getElementById('examObtMarks').value) || 0,
    overallRank: rank,
    totalStudents: totalStudents,
    overallPercentile: examCalcPercentile(rank, totalStudents),
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
  const subjects = examDraftSubjects.filter(s => s.name && s.name.trim());
  if (!subjects.length) { host.innerHTML = '<div class="exam-empty">Add subjects in the main form first.</div>'; return; }
  let html = '';
  subjects.forEach(s => {
    const fam = examSubjFamily(s.name);
    const units = fam ? BROAD_UNITS[fam] : null;
    if (!units) return;
    if (!examDraftAnalysis[s.name]) examDraftAnalysis[s.name] = {};
    html += `<div class="exam-analysis-subj"><div class="exam-analysis-subj-name">${escHtml(s.name)}</div>
      <div class="exam-analysis-hdr"><span>Topic</span><span>Attempted %</span><span>Scored %</span></div>
      ${units.map(u => {
        const v = examDraftAnalysis[s.name][u] || { attempted: '', scored: '' };
        return `<div class="exam-analysis-unit-row">
          <span class="exam-analysis-unit-name">${escHtml(u)}</span>
          <input type="number" min="0" max="100" value="${v.attempted}" oninput="setExamAnalysisVal('${escHtml(s.name)}','${escHtml(u)}','attempted',this.value)">
          <input type="number" min="0" max="100" value="${v.scored}" oninput="setExamAnalysisVal('${escHtml(s.name)}','${escHtml(u)}','scored',this.value)">
        </div>`;
      }).join('')}
      <div class="exam-review-box">
        <div class="exam-review-label">Your ${escHtml(s.name)} review</div>
        <textarea placeholder="What felt easy, what to revise, how you felt going in..." oninput="examDraftReviews['${escHtml(s.name)}']=this.value">${escHtml(examDraftReviews[s.name] || '')}</textarea>
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

/* JEE Main and JEE Advanced are always plotted as separate coloured series — never merged into one line */
function examBuildJmJaDatasets(tests, valueFn, colorOther) {
  if (examMode !== 'jee') {
    return [{
      label: 'Score', data: tests.map(valueFn), borderColor: colorOther, backgroundColor: hexAlpha(colorOther, .18),
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: colorOther, tension: .3, fill: true, spanGaps: true
    }];
  }
  const colors = { JM: '#5b8dee', JA: '#e84a8a', Other: colorOther };
  const names = { JM: 'JEE Main', JA: 'JEE Advanced', Other: 'Other JEE' };
  const groups = { JM: [], JA: [], Other: [] };
  tests.forEach((t, i) => { groups[examJmJa(t) || 'Other'].push(i); });
  return Object.keys(groups).filter(g => groups[g].length).map(g => ({
    label: names[g],
    data: tests.map((t, i) => groups[g].includes(i) ? valueFn(t) : null),
    borderColor: colors[g], backgroundColor: hexAlpha(colors[g], .16),
    borderWidth: 2, pointRadius: 3, pointBackgroundColor: colors[g], tension: .3, fill: false, spanGaps: true
  }));
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
  if (!tests.length) { progCanvas.style.display = 'none'; progMsg.style.display = 'block'; document.getElementById('examWebSubjPicker').innerHTML = ''; return; }
  progCanvas.style.display = 'block'; progMsg.style.display = 'none';

  const tc = '#7fae8f';
  const gc = 'rgba(34,197,94,0.1)';
  const pctFn = t => t.totalMarks ? Math.round((t.obtainedMarks / t.totalMarks) * 1000) / 10 : 0;
  const rankFn = t => t.overallRank != null ? t.overallRank : null;

  // Progress over time (marks %) — JM/JA always split into separate coloured series
  document.getElementById('examMarksTrendBadge').innerHTML = examTrendBadgeHTML(tests, pctFn, true);
  examProgressChart = new Chart(progCanvas, {
    type: 'line',
    data: { labels: tests.map(t => t.name), datasets: examBuildJmJaDatasets(tests, pctFn, '#22c55e') },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: examMode === 'jee', position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
        y: { grid: { color: gc }, ticks: { color: tc, font: { size: 9 }, callback: v => v + '%' }, beginAtZero: true, max: 100 }
      }
    }
  });

  // Rank over time — lower is better, so the axis is reversed; JM/JA split the same way
  document.getElementById('examRankTrendBadge').innerHTML = examTrendBadgeHTML(tests, rankFn, false);
  examRankChart = new Chart(document.getElementById('examRankChart'), {
    type: 'line',
    data: { labels: tests.map(t => t.name), datasets: examBuildJmJaDatasets(tests, rankFn, '#f5c842') },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: examMode === 'jee', position: 'bottom', labels: { color: tc, font: { size: 9 }, boxWidth: 10 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tc, font: { size: 9 }, maxRotation: 30 } },
        y: { reverse: true, grid: { color: gc }, ticks: { color: tc, font: { size: 9 } } }
      }
    }
  });

  // Subject-wise performance per test (grouped bars, % of each subject's max)
  const famSet = new Set();
  tests.forEach(t => (t.subjects || []).forEach(s => { const f = examSubjFamily(s.name); if (f) famSet.add(f); }));
  const fams = [...famSet];
  examSubjBarChart = new Chart(document.getElementById('examSubjBarChart'), {
    type: 'bar',
    data: {
      labels: tests.map(t => t.name),
      datasets: fams.map(f => ({
        label: f.charAt(0).toUpperCase() + f.slice(1),
        data: tests.map(t => { const s = (t.subjects || []).find(s => examSubjFamily(s.name) === f); return s ? (s.max ? Math.round((s.score / s.max) * 1000) / 10 : s.score) : null; }),
        backgroundColor: EXAM_SUBJ_COLOR[f], borderRadius: 3, borderSkipped: false, barPercentage: 1, categoryPercentage: .92
      }))
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

  // Weak/strong broad-topic radar — averaged "scored %" from every test's paper analysis, across all subjects
  const unitAgg = {};
  tests.forEach(t => { if (!t.analysis) return; Object.values(t.analysis).forEach(units => Object.keys(units).forEach(u => {
    const v = units[u]; if (v.scored === '' || v.scored == null) return;
    if (!unitAgg[u]) unitAgg[u] = { sum: 0, n: 0 };
    unitAgg[u].sum += Number(v.scored); unitAgg[u].n++;
  })); });
  const unitNames = Object.keys(unitAgg);
  examRadarChart = new Chart(document.getElementById('examRadarChart'), {
    type: 'radar',
    data: {
      labels: unitNames.length ? unitNames : ['No analysis data yet'],
      datasets: [{
        label: 'Avg. scored %', data: unitNames.length ? unitNames.map(n => Math.round(unitAgg[n].sum / unitAgg[n].n)) : [0],
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

  const wUnitAgg = {}; // unit -> {attSum,attN,scoSum,scoN}
  if (examWebSubj) {
    tests.forEach(t => {
      const units = t.analysis?.[examWebSubj]; if (!units) return;
      Object.keys(units).forEach(u => {
        const v = units[u];
        if (!wUnitAgg[u]) wUnitAgg[u] = { attSum: 0, attN: 0, scoSum: 0, scoN: 0 };
        if (v.attempted !== '' && v.attempted != null) { wUnitAgg[u].attSum += Number(v.attempted); wUnitAgg[u].attN++; }
        if (v.scored !== '' && v.scored != null) { wUnitAgg[u].scoSum += Number(v.scored); wUnitAgg[u].scoN++; }
      });
    });
  }
  const wNames = Object.keys(wUnitAgg);
  examWebChart = new Chart(document.getElementById('examWebChart'), {
    type: 'radar',
    data: {
      labels: wNames.length ? wNames : ['No analysis data yet'],
      datasets: [
        { label: 'Attempted %', data: wNames.length ? wNames.map(n => Math.round(wUnitAgg[n].attSum / (wUnitAgg[n].attN || 1))) : [0], backgroundColor: 'rgba(91,141,238,.22)', borderColor: '#5b8dee', pointBackgroundColor: '#5b8dee' },
        { label: 'Scored %', data: wNames.length ? wNames.map(n => Math.round(wUnitAgg[n].scoSum / (wUnitAgg[n].scoN || 1))) : [0], backgroundColor: 'rgba(34,197,94,.22)', borderColor: '#22c55e', pointBackgroundColor: '#22c55e' }
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

/* ════════════════════════════════════════════════════════════
   SYLLABUS TRACKER
════════════════════════════════════════════════════════════ */
let sylMode = 'jee';          // 'jee' | 'neet' | 'other'
let sylUid = null;
let sylSubjectKey = null;
let sylViewMode = 'priority'; // 'priority' | 'unit'
let sylClassFilter = 'both';  // '11th' | '12th' | 'both'
let sylSearch = '';
let sylOpenGroups = new Set();
let sylOpenChapter = null;

function sylKey(s) { return String(s).replace(/[.#$\[\]\/]/g, '_').replace(/\s+/g, '_').slice(0, 80); }

function renderSyllabusPage() {
  renderSylModeToggle();
  renderSylChips();
  renderSylBody();
}

function renderSylModeToggle() {
  const host = document.getElementById('sylModeToggle');
  if (!host) return;
  host.innerHTML = ['jee', 'neet', 'other'].map(m =>
    `<button class="syl-mode-btn ${m === sylMode ? 'active' : ''}" onclick="setSylMode('${m}')">${m === 'jee' ? 'JEE' : m === 'neet' ? 'NEET' : 'Other'}</button>`).join('');
}
function setSylMode(m) { sylMode = m; sylSubjectKey = null; sylOpenGroups.clear(); sylOpenChapter = null; renderSyllabusPage(); }

function renderSylChips() {
  const host = document.getElementById('sylChipRow');
  if (!host) return;
  const users = userList();
  if (!users.length) { host.innerHTML = '<div class="syl-empty" style="padding:.4rem">Add a person on the Question Tracker page first.</div>'; return; }
  if (!sylUid || !state.users[sylUid]) sylUid = users[0].id;
  host.innerHTML = users.map(u =>
    `<button class="syl-chip ${u.id === sylUid ? 'active' : ''}" onclick="selectSylUser('${u.id}')">${escHtml(u.name)}</button>`).join('');
}
function selectSylUser(uid) { sylUid = uid; sylSubjectKey = null; sylOpenGroups.clear(); sylOpenChapter = null; renderSylBody(); }

function sylSubjectsForMode() {
  if (sylMode === 'other') {
    const custom = (state.syllabus.custom[sylUid] && state.syllabus.custom[sylUid].subjects) || {};
    return Object.keys(custom).map(id => ({ key: id, name: custom[id].name, chapters: Object.values(custom[id].chapters || {}), custom: true }));
  }
  const src = SYLLABUS_DATA[sylMode];
  return Object.keys(src).map(key => ({ key, name: src[key].name, chapters: src[key].chapters, custom: false }));
}

function sylChapterStatus(uid, mode, subjKey, chKey) {
  const node = state.syllabus.progress[uid]?.[mode]?.[subjKey]?.[chKey];
  return (node && node.status) || 'pending';
}
function sylChapterRevs(uid, mode, subjKey, chKey) {
  const node = state.syllabus.progress[uid]?.[mode]?.[subjKey]?.[chKey];
  return (node && node.rev) || 0;
}
function sylChapterBacklog(uid, mode, subjKey, chKey) {
  const node = state.syllabus.progress[uid]?.[mode]?.[subjKey]?.[chKey];
  return !!(node && node.backlog);
}
function sylChapterPractice(uid, mode, subjKey, chKey) {
  const node = state.syllabus.progress[uid]?.[mode]?.[subjKey]?.[chKey];
  return (node && node.practice) || 0;
}

function sylClassMatch(cls) { return sylClassFilter === 'both' || !cls || cls === 'Both' || cls === sylClassFilter; }

/* Weighted progress for a set of chapters: { pct, potential, earned, mastered, doing, todo, total } */
function sylComputeStats(uid, mode, subjKey, chapters) {
  let potential = 0, earned = 0, mastered = 0, doing = 0, todo = 0, total = 0;
  chapters.forEach(ch => {
    if (!sylClassMatch(ch.cls)) return;
    if (sylSearch && !ch.name.toLowerCase().includes(sylSearch.toLowerCase())) return;
    const w = PRIORITY_WEIGHT[ch.tier] || 1;
    const st = sylChapterStatus(uid, mode, subjKey, sylKey(ch.name));
    potential += w; earned += w * STATUS_VALUE[st]; total++;
    if (st === 'mastered') mastered++;
    else if (st === 'pending') todo++;
    else doing++;
  });
  return { pct: potential ? Math.round((earned / potential) * 1000) / 10 : 0, potential, earned, mastered, doing, todo, total };
}

function renderSylBody() {
  const host = document.getElementById('sylBody');
  if (!host) return;
  if (!userList().length) { host.innerHTML = ''; return; }
  const subjects = sylSubjectsForMode();
  if (!sylSubjectKey || !subjects.find(s => s.key === sylSubjectKey)) sylSubjectKey = subjects[0]?.key || null;

  // Overall stats across every subject in this mode (for the summary card)
  let allCh = [];
  subjects.forEach(s => allCh = allCh.concat(s.chapters.map(c => ({ ...c, __subj: s.key }))));
  const overall = sylComputeStatsMixed(allCh);

  let html = `
    <div class="syl-summary-card">
      <div class="syl-progress-big">${overall.pct}%</div>
      <div class="syl-progress-label">Covered${sylClassFilter !== 'both' ? ' · ' + sylClassFilter : ''}</div>
      <div class="syl-progress-bar-track"><div class="syl-progress-bar-fill" style="width:${overall.pct}%"></div></div>
      <div class="syl-stat-row">
        <div><div class="syl-stat-mini-label">Mastered</div><div class="syl-stat-mini-value">${overall.mastered}</div></div>
        <div><div class="syl-stat-mini-label">Doing</div><div class="syl-stat-mini-value">${overall.doing}</div></div>
        <div><div class="syl-stat-mini-label">To Do</div><div class="syl-stat-mini-value">${overall.todo}</div></div>
      </div>
      <div class="syl-filter-block">
        <div class="syl-filter-label">Class Filter</div>
        <div class="syl-filter-btns">
          ${['11th','12th','both'].map(c => `<button class="syl-filter-btn ${sylClassFilter===c?'active':''}" onclick="setSylClassFilter('${c}')">${c==='both'?'All':c}</button>`).join('')}
        </div>
      </div>
      <div class="syl-filter-block">
        <div class="syl-filter-label">View Mode</div>
        <div class="syl-filter-btns">
          ${['priority','unit','progress'].map(v => `<button class="syl-filter-btn ${sylViewMode===v?'active':''}" onclick="setSylViewMode('${v}')">${v==='priority'?'Priority':v==='unit'?'Unit':'Progress'}</button>`).join('')}
        </div>
      </div>
      <input class="syl-search-inp" type="text" placeholder="Search chapters..." value="${escHtml(sylSearch)}" oninput="setSylSearch(this.value)">
      <div class="syl-actions-row">
        <button class="syl-btn-sm ghost" onclick="shareSylProgress()">Share</button>
        <button class="syl-btn-sm ghost" onclick="resetSylProgress()">Reset</button>
      </div>
    </div>`;

  if (!subjects.length) {
    html += sylMode === 'other'
      ? `<div class="syl-empty">No custom subjects yet.</div>${sylAddSubjectFormHTML()}`
      : `<div class="syl-empty">No syllabus data.</div>`;
    html += sylFormulaBoxHTML();
    host.innerHTML = html;
    return;
  }

  if (sylViewMode === 'progress') {
    // "Progress" view — every subject side by side, two per row, last one spanning full width if odd
    html += `<div class="syl-progress-grid">${subjects.map(s => {
      const st = sylComputeStats(sylUid, sylMode, s.key, s.chapters);
      return `<div class="syl-progress-panel">
        <div class="syl-progress-panel-name">${escHtml(s.name)}</div>
        <div class="syl-progress-panel-pct">${st.pct}%</div>
        <div class="syl-progress-panel-bar"><div class="syl-progress-panel-bar-fill" style="width:${st.pct}%"></div></div>
        <div class="syl-progress-panel-stats">
          <div>Mastered: <b>${st.mastered}</b></div>
          <div>Doing: <b>${st.doing}</b></div>
          <div>To Do: <b>${st.todo}</b></div>
        </div>
      </div>`;
    }).join('')}</div>`;
    html += sylFormulaBoxHTML();
    host.innerHTML = html;
    return;
  }

  html += `<div class="syl-subject-tabs">${subjects.map(s => {
    const st = sylComputeStats(sylUid, sylMode, s.key, s.chapters);
    return `<div class="syl-subject-tab ${s.key === sylSubjectKey ? 'active' : ''}" onclick="selectSylSubject('${s.key}')">
      <div class="syl-subject-tab-name">${escHtml(s.name)}<span class="syl-subject-tab-pct">${st.pct}%</span></div>
      <div class="syl-subject-tab-count">${st.total} chapters</div>
    </div>`;
  }).join('')}</div>`;

  const subj = subjects.find(s => s.key === sylSubjectKey);
  if (subj) html += renderSylSubjectGroups(subj);
  if (sylMode === 'other') html += sylAddSubjectFormHTML() + (subj ? sylAddChapterFormHTML(subj) : '');

  html += sylFormulaBoxHTML();
  host.innerHTML = html;
}

/* Plain-language, always-visible explanation of how the progress % is worked out */
function sylFormulaBoxHTML() {
  return `
    <div class="syl-formula-box">
      <h4>How is the progress % worked out?</h4>
      Every chapter is given a priority — <code>A</code>, <code>B</code>, <code>C</code> or <code>D</code> — based on how often it tends to show up and how heavily it's weighted in past papers. Higher-priority chapters count for more, the same way a 4-mark question matters more to your score than a 1-mark one.
      <br><br>
      Each status is worth a fraction of that chapter's weight: <code>Pending</code> = 0%, <code>Theory done</code> = 50%, <code>PYQs done</code> or <code>Mastered</code> = 100%. Your subject % is simply <em>(weight actually earned) ÷ (total weight possible)</em> — so finishing five easy D-priority chapters moves the needle far less than finishing one A-priority chapter.
      <br><br>
      In short: <b>Progress % = earned weight ÷ total possible weight, summed across every chapter you're tracking.</b> It rewards you for clearing the chapters that matter most first, not just for ticking off the most boxes.
    </div>`;
}

function sylComputeStatsMixed(chaptersWithSubj) {
  let potential = 0, earned = 0, mastered = 0, doing = 0, todo = 0, total = 0;
  chaptersWithSubj.forEach(ch => {
    if (!sylClassMatch(ch.cls)) return;
    const w = PRIORITY_WEIGHT[ch.tier] || 1;
    const st = sylChapterStatus(sylUid, sylMode, ch.__subj, sylKey(ch.name));
    potential += w; earned += w * STATUS_VALUE[st]; total++;
    if (st === 'mastered') mastered++;
    else if (st === 'pending') todo++;
    else doing++;
  });
  return { pct: potential ? Math.round((earned / potential) * 1000) / 10 : 0, potential, earned, mastered, doing, todo, total };
}

function selectSylSubject(key) { sylSubjectKey = key; sylOpenGroups.clear(); sylOpenChapter = null; renderSylBody(); }
function setSylClassFilter(c) { sylClassFilter = c; renderSylBody(); }
function setSylViewMode(v) { sylViewMode = v; sylOpenGroups.clear(); renderSylBody(); }
function setSylSearch(v) { sylSearch = v; renderSylBody(); }

function renderSylSubjectGroups(subj) {
  const chapters = subj.chapters.filter(ch => !sylSearch || ch.name.toLowerCase().includes(sylSearch.toLowerCase()));
  let groupKeys, groupOf, groupLabel;
  if (sylViewMode === 'priority' || subj.custom) {
    groupKeys = ['A', 'Adv', 'B', 'C', 'D'];
    groupOf = ch => ch.tier || 'D';
    groupLabel = k => ({ A: 'Priority A', Adv: 'Priority Adv', B: 'Priority B', C: 'Priority C', D: 'Priority D' }[k]);
  } else {
    groupKeys = BROAD_UNITS[subj.key] || [...new Set(chapters.map(c => c.unit))];
    groupOf = ch => ch.unit || 'Other';
    groupLabel = k => k;
  }
  let html = '<div class="syl-groups-grid">';
  groupKeys.forEach(gk => {
    const chs = chapters.filter(ch => groupOf(ch) === gk && sylClassMatch(ch.cls));
    if (!chs.length) return;
    const st = sylComputeStats(sylUid, sylMode, subj.key, chs);
    const open = sylOpenGroups.has(gk);
    html += `
      <div class="syl-group">
        <div class="syl-group-head" onclick="toggleSylGroup('${gk}')">
          <div class="syl-group-name">${escHtml(groupLabel(gk))}</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0"><span class="syl-group-pct">${st.pct}%</span><span class="syl-chevron ${open?'open':''}">▾</span></div>
        </div>
        ${open ? `<div class="syl-group-body">${chs.map(ch => renderSylChapterRow(subj, ch)).join('')}</div>` : ''}
      </div>`;
  });
  html += '</div>';
  return html === '<div class="syl-groups-grid"></div>' ? '<div class="syl-empty">No chapters match.</div>' : html;
}

function toggleSylGroup(gk) { sylOpenGroups.has(gk) ? sylOpenGroups.delete(gk) : sylOpenGroups.add(gk); renderSylBody(); }

function renderSylChapterRow(subj, ch) {
  const chKey = sylKey(ch.name);
  const status = sylChapterStatus(sylUid, sylMode, subj.key, chKey);
  const revs = sylChapterRevs(sylUid, sylMode, subj.key, chKey);
  const backlog = sylChapterBacklog(sylUid, sylMode, subj.key, chKey);
  const practice = sylChapterPractice(sylUid, sylMode, subj.key, chKey);
  const open = sylOpenChapter === subj.key + '::' + chKey;
  return `
    <div class="syl-chapter-row">
      <div class="syl-chapter-top" onclick="toggleSylChapter('${subj.key}','${chKey}')">
        <div class="syl-chapter-name"><span class="syl-status-dot ${backlog ? 'backlog' : status}"></span><span class="syl-chapter-name-text">${escHtml(ch.name)}</span></div>
        <div class="syl-chapter-meta">${ch.cls ? `<span class="syl-cls-tag">${ch.cls}</span>` : ''}<span class="syl-chevron ${open?'open':''}">▾</span></div>
      </div>
      ${open ? `
      <div class="syl-chapter-detail">
        <div class="syl-status-btns">
          ${['pending','theory','pyq','mastered'].map(s => `<button class="syl-status-btn ${status===s?'active':''}" onclick="setSylStatus('${subj.key}','${chKey}','${s}')">${STATUS_LABEL[s]}</button>`).join('')}
        </div>
        <div class="syl-rev-row">
          <span class="syl-rev-label">Revisions</span>
          <div class="syl-rev-ctrl">
            <button class="syl-rev-btn" onclick="bumpSylRev('${subj.key}','${chKey}',-1)">−</button>
            <span class="syl-rev-count">${revs}</span>
            <button class="syl-rev-btn" onclick="bumpSylRev('${subj.key}','${chKey}',1)">+</button>
          </div>
        </div>
        <div class="syl-extra-btns">
          <button class="syl-extra-btn backlog ${backlog ? 'active' : ''}" onclick="toggleSylBacklog('${subj.key}','${chKey}')">${backlog ? 'In Backlog' : 'Backlog'}</button>
          <button class="syl-extra-btn practice" onclick="bumpSylPractice('${subj.key}','${chKey}',1)">Practice<span class="syl-practice-count">${practice}</span></button>
        </div>
        ${subj.custom ? `<button class="syl-btn-sm ghost" style="margin-top:.5rem" onclick="deleteSylChapter('${subj.key}','${ch.id}')">Delete chapter</button>` : ''}
      </div>` : ''}
    </div>`;
}

function toggleSylChapter(subjKey, chKey) {
  const id = subjKey + '::' + chKey;
  sylOpenChapter = sylOpenChapter === id ? null : id;
  renderSylBody();
}

function sylProgressPath(subjKey, chKey) { return `/syllabus/progress/${sylUid}/${sylMode}/${subjKey}/${chKey}`; }

function setSylStatus(subjKey, chKey, status) {
  const cur = state.syllabus.progress[sylUid]?.[sylMode]?.[subjKey]?.[chKey] || {};
  doWrite(() => fbPut(sylProgressPath(subjKey, chKey), { status, rev: cur.rev || 0, backlog: !!cur.backlog, practice: cur.practice || 0 }))
    .then(ok => { if (ok) renderSylBody(); });
}

function bumpSylRev(subjKey, chKey, delta) {
  const cur = state.syllabus.progress[sylUid]?.[sylMode]?.[subjKey]?.[chKey] || { status: 'pending', rev: 0 };
  const rev = Math.max(0, (cur.rev || 0) + delta);
  doWrite(() => fbPut(sylProgressPath(subjKey, chKey), { status: cur.status || 'pending', rev, backlog: !!cur.backlog, practice: cur.practice || 0 }))
    .then(ok => { if (ok) renderSylBody(); });
}

function toggleSylBacklog(subjKey, chKey) {
  const cur = state.syllabus.progress[sylUid]?.[sylMode]?.[subjKey]?.[chKey] || { status: 'pending', rev: 0, practice: 0 };
  doWrite(() => fbPut(sylProgressPath(subjKey, chKey), { status: cur.status || 'pending', rev: cur.rev || 0, backlog: !cur.backlog, practice: cur.practice || 0 }))
    .then(ok => { if (ok) renderSylBody(); });
}

function bumpSylPractice(subjKey, chKey, delta) {
  const cur = state.syllabus.progress[sylUid]?.[sylMode]?.[subjKey]?.[chKey] || { status: 'pending', rev: 0, backlog: false };
  const practice = Math.max(0, (cur.practice || 0) + delta);
  doWrite(() => fbPut(sylProgressPath(subjKey, chKey), { status: cur.status || 'pending', rev: cur.rev || 0, backlog: !!cur.backlog, practice }))
    .then(ok => { if (ok) renderSylBody(); });
}

function shareSylProgress() {
  const subjects = sylSubjectsForMode();
  const lines = [`${state.users[sylUid]?.name || ''}'s ${sylMode.toUpperCase()} syllabus progress:`];
  subjects.forEach(s => { const st = sylComputeStats(sylUid, sylMode, s.key, s.chapters); lines.push(`${s.name}: ${st.pct}%`); });
  const text = lines.join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => showToast(text));
  else showToast(text);
}

function resetSylProgress() {
  if (!confirm(`Reset all ${sylMode.toUpperCase()} progress for ${state.users[sylUid]?.name || 'this person'}?`)) return;
  doWrite(() => fbDelete(`/syllabus/progress/${sylUid}/${sylMode}`)).then(ok => { if (ok) showToast('Progress reset'); });
}

/* ── "Other" mode: custom subjects & chapters ── */
function sylAddSubjectFormHTML() {
  return `
    <div class="syl-add-row">
      <input type="text" id="sylNewSubjName" placeholder="New subject name" style="flex:1">
      <button class="syl-btn-sm" onclick="addSylSubject()">+ Add Subject</button>
    </div>`;
}
function sylAddChapterFormHTML(subj) {
  return `
    <div class="syl-add-row">
      <input type="text" id="sylNewChName" placeholder="New chapter in ${escHtml(subj.name)}" style="flex:2">
      <select id="sylNewChTier"><option value="A">A</option><option value="Adv">Adv</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
      <button class="syl-btn-sm" onclick="addSylChapter('${subj.key}')">+ Add</button>
    </div>`;
}
function addSylSubject() {
  const inp = document.getElementById('sylNewSubjName');
  const name = inp.value.trim();
  if (!name) return;
  const id = 'sub' + Date.now();
  doWrite(() => fbPut(`/syllabus/custom/${sylUid}/subjects/${id}`, { id, name, chapters: {} }))
    .then(ok => { if (ok) { sylSubjectKey = id; showToast('Subject added'); } });
}
function addSylChapter(subjKey) {
  const nameInp = document.getElementById('sylNewChName');
  const tierInp = document.getElementById('sylNewChTier');
  const name = nameInp.value.trim();
  if (!name) return;
  const id = 'ch' + Date.now();
  doWrite(() => fbPut(`/syllabus/custom/${sylUid}/subjects/${subjKey}/chapters/${id}`, { id, name, tier: tierInp.value, unit: 'Custom', cls: 'Both' }))
    .then(ok => { if (ok) showToast('Chapter added'); });
}
function deleteSylChapter(subjKey, chId) {
  if (!confirm('Delete this chapter?')) return;
  doWrite(() => fbDelete(`/syllabus/custom/${sylUid}/subjects/${subjKey}/chapters/${chId}`)).then(ok => { if (ok) showToast('Deleted'); });
}

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

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  initCal();
  initStudyCal();
  initSession();
  loadLocal();   // instant render from cache
  renderAll();
  await loadRemote(); // then sync from Firebase
  startPoll();
  checkFirstVisit();
  initDevWarning();

  // Modal overlay dismiss
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });

  // Enter key on add user input
  document.getElementById('newUserName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addUser();
  });

  // Enter key on new subject input
  document.getElementById('newSubjInp').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubjDraft();
  });
});

