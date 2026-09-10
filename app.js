
/* ═══════════════════════════════════════════════════════════════
   QTrack 0.5.0 — app.js
   Architecture: Firebase REST, write-then-read, no polling conflicts
═══════════════════════════════════════════════════════════════ */

const FB = 'https://qtrack-d4724-default-rtdb.firebaseio.com';
const VERSION = '0.9.6';

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
      mkCh('Radioactivity','D','Modern Physics','12th'),
      mkCh('atomic physics','A','Modern Physics','12th'),
      mkCh('nuclear physics','A','Modern Physics','12th'),
      mkCh('Current Electricity','A','Electrostatics and current dynamics','12th'),
      mkCh('Electrostatics-1','A','Electrostatics and current dynamics','12th'),
      mkCh('Electrostatics-2','A','Electrostatics and current dynamics','12th'),
      mkCh('Capacitance','A','Electrostatics and current dynamics','12th'),
      mkCh('Magnetic Effects of Current & Magnetism','A','Magnetism','12th'),
      mkCh('Magnetism and its properites','C','Magnetism','12th'),
      mkCh('Electromagnetic Induction','B','Electromagnetism','12th'),
      mkCh('EM waves','B','Electromagnetism','12th'),
      mkCh('Alternating current','B','Electromagnetism','12th'),
      mkCh('Ray Optics','A','Optics','12th'),
      mkCh('Wave Optics','B','Optics','12th'),
      mkCh('Rotational Motion','A','Mechanics','11th'),
      mkCh('Work, Energy & Power','A','Mechanics','11th'),
      mkCh("Newton's Laws & Friction",'B','Mechanics','11th'),
      mkCh('Kinematics','B','Mechanics','11th'),
      mkCh('Projectile and 2D motion','B','Mechanics','11th'),
      mkCh('Simple Harmonic Motion','B','Oscillations & Waves','11th'),
      mkCh('Waves','C','Oscillations & Waves','11th'),
      mkCh('sound','C','Oscillations & Waves','11th'),
      mkCh('Thermodynamics','A','Thermodynamics and Thermal Physics','11th'),
      mkCh('KTG','A','Thermodynamics and Thermal Physics','11th'),
      mkCh('Gravitation','B','Mechanics','11th'),
      mkCh('Fluids','B','Mechanics','11th'),
      mkCh('Centre of Mass, Momentum & Collisions','C','Mechanics','11th'),
      mkCh('Mechanical Properties of Solids','C','Mechanics','11th'),
      mkCh('Heat transfer','C','Thermodynamics and Thermal Physics','11th'),
      mkCh('Calorimetry','B','Thermodynamics and Thermal Physics','11th'),
      mkCh('Theemal expansion','C','Thermodynamics and Thermal Physics','11th'),
      mkCh('Units, Dimensions & Errors','C','Experimental Physics','11th'),
      mkCh('Experimental Physics','C','Experimental Physics','Both'),
      mkCh('Basic Mathematics and vector','D','Experimental Physics','11th'),
      mkCh('Semiconductor','B','Misclaneous physics','12th')
    ]},
    chemistry: { name: 'Chemistry', chapters: [
      mkCh('Chemical Bonding & Molecular Structure','A','Inorganic Chemistry','11th'),
      mkCh('Coordination Compounds','A','Inorganic Chemistry','12th'),
      mkCh('General Organic Chemistry (GOC)','A','Organic Chemistry','11th'),
      mkCh('Isomerism','A','Organic Chemistry','11th'),
      mkCh('IUPAC nomenclature','A','Organic Chemistry','11th'),
      mkCh('Aldehydes, Ketones & Carboxylic Acids','A','Organic Chemistry','12th'),
      mkCh('Amines','A','Organic Chemistry','12th'),
      mkCh('Electrochemistry','A','Physical Chemistry','12th'),
      mkCh('Chemical Kinetics','A','Physical Chemistry','12th'),
      mkCh('Thermodynamics','A','Physical Chemistry','11th'),
      mkCh('Thermochemistry','A','Physical Chemistry','11th'),
      mkCh('Mole Concept & Stoichiometry','B','Physical Chemistry','11th'),
      mkCh('Atomic Structure','B','Physical Chemistry','11th'),
      mkCh('Chemical Equilibrium','C','Physical Chemistry','11th'),
      mkCh('Ionic equilibrium','B','Physical Chemistry','11th'),
      mkCh('Periodic Table & Periodicity','B','Inorganic Chemistry','11th'),
      mkCh('p-Block Elements','B','Inorganic Chemistry','Both'),
      mkCh('d- and f-Block Elements','B','Inorganic Chemistry','12th'),
      mkCh('Alcohols, Phenols & Ethers','B','Organic Chemistry','12th'),
      mkCh('Hydrocarbons','B','Organic Chemistry','11th'),
      mkCh('Solutions','C','Physical Chemistry','12th'),
      mkCh('States of Matter','C','Physical Chemistry','11th'),
      mkCh('Redox Reactions','C','Physical Chemistry','11th'),
      mkCh('Haloalkanes & Haloarenes','B','Organic Chemistry','12th'),
      mkCh('Biomolecules','B','Organic Chemistry','12th'),
      mkCh('Practical/Qualitative Chemistry','C','Inorganic Chemistry','Both'),
      mkCh('Metallurgy','C','Inorganic Chemistry','12th'),
      mkCh('Solid State','D','Physical Chemistry','12th'),
      mkCh('Surface Chemistry','D','Physical Chemistry','12th'),
      mkCh('Polymers & Chemistry in Everyday Life','D','Organic Chemistry','12th'),
      mkCh('Environmental Chemistry','D','Physical Chemistry','11th'),
      mkCh('Hydrogen','D','Inorganic Chemistry','12th'),
      mkCh('s block','D','Inorganic Chemistry','12th')
    ]},
    maths: { name: 'Mathematics', chapters: [
      mkCh('Limits','A','Calculus','12th'),
      mkCh('Continuity & Differentiability','C','Calculus','12th'),
      mkCh('Application of Derivatives','B','Calculus','12th'),
      mkCh('Indefinite Integration','A','Calculus','12th'),
      mkCh('Definite Integration & Area','A','Calculus','12th'),
      mkCh('Matrices','A','Algebra','12th'),
      mkCh('Determinants','A','Algebra','12th'),
      mkCh('Straight Line','A','Conic section and coordinate geometry','11th'),
      mkCh('Circle','B','Conic section and coordinate geometry','11th'),
      mkCh('Parabola','B','Conic section and coordinate geometry','11th'),
      mkCh('Hyperbola','B','Conic section and coordinate geometry','11th'),
      mkCh('Ellipse','B','Conic section and coordinate geometry','11th'),
      mkCh('Probability','A','Algebra','12th'),
      mkCh('Complex Numbers-1','B','Algebra','11th'),
      mkCh('Complex Numbers-2','B','Algebra','11th'),
      mkCh('Quadratif equation','B','Algebra','11th'),
      mkCh('Sequence & Series','A','Algebra','11th'),
      mkCh('Differential Equations','B','Calculus','12th'),
      mkCh('Vector Algebra','A','Vector & 3D Geometry','12th'),
      mkCh('3D Geometry','A','Vector & 3D Geometry','12th'),
      mkCh('Trigonometric functions','A','Trigonometry','11th'),
      mkCh('Trigonometric equation','C','Trigonometry','11th'),
      mkCh('inverse Trigonometry','C','Trigonometry','11th'),
      mkCh('Binomial Theorem','B','Algebra','11th'),
      mkCh('Functions','A','Sets, Relations & Functions','11th'),
      mkCh('Sets & Relations','C','Sets, Relations & Functions','11th'),
      mkCh('Permutations & Combinations','C','Algebra','11th'),
      mkCh('Statistics','C','Algebra','11th'),
      mkCh('Basic Algebra, modulus and Inequalities','D','Algebra','11th')
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

/* ── Share invite (session popup) ──
   Builds a shareable link that carries the session ID as a query param, plus a short
   code and a friendly ready-to-send message. Opening the link with ?join=SID auto-fills
   the join box (wired up below in checkJoinLink()). */
function buildShareInviteLink() {
  const url = new URL(location.href);
  url.search = ''; url.hash = '';
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
  const drop = document.getElementById('allTimeDropdown');
  const btn = document.getElementById('allTimeDropBtn');
  if (drop && drop.style.display === 'block' && !drop.contains(e.target) && e.target !== btn) drop.style.display = 'none';
  const drop2 = document.getElementById('todayDropdown');
  const btn2 = document.getElementById('todayDropBtn');
  if (drop2 && drop2.style.display === 'block' && !drop2.contains(e.target) && e.target !== btn2) drop2.style.display = 'none';
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
    data: keys.map(dt => weekVisibleDayTotal(dt, s.id)),
    backgroundColor: s.color, borderRadius: 4, borderSkipped: false, order: 2
  }));
  // Trend line over the bars — total questions per day
  const trendColor = document.documentElement.dataset.theme === 'light' ? '#111112' : '#f0ede8';
  datasets.push({
    type: 'line', label: 'Trend',
    data: keys.map(dt => weekVisibleDayGrandTotal(dt)),
    borderColor: trendColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0,
    tension: .35, fill: false, yAxisID: 'yLine', order: 1
  });
  if (weekChart) { weekChart.destroy(); weekChart = null; }
  weekChart = buildChart('weeklyChart', labels, datasets, todayIdx);
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
  // Leaving Exam Analytics always re-locks: any auth for this viewing session is dropped the
  // instant you navigate away, so coming back (even to the same person) demands the password again.
  if (pageId !== 'examPage') { examAuthedUid = null; examAuthedCompareUid = null; }
  if (pageId === 'leaderboardPage') renderLeaderboard();
  if (pageId === 'studyPage') renderStudyPage();
  if (pageId === 'examPage') renderExamPage();
  if (pageId === 'syllabusPage') renderSyllabusPage();
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
        <div style="font-size:2rem;margin-bottom:.5rem">🔒</div>
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
    resultHost.innerHTML = `<div class="exam-empty" style="text-align:center;padding:1.4rem 1rem">🔒 ${escHtml(state.users[examCompareUid]?.name || 'This person')}'s data is locked.
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
    const circleColor = examScoreColor(t.obtainedMarks, t.totalMarks || 1);
    const circles = examCirclesForTest(t);
    const percentile = t.overallPercentile != null ? t.overallPercentile : examCalcPercentile(t.overallRank, t.totalStudents);
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
        </div>
      </div>
      <div class="exam-score-row">
        <div class="exam-score-circle main" style="background:${circleColor}">${t.obtainedMarks ?? 0}<br><span style="font-size:.8em">/${t.totalMarks ?? 0}</span></div>
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
        <div>Percentile: <b>${percentile != null ? percentile + '%' : '—'}</b></div>`}
      </div>
      ${t.note ? `<div class="exam-note-box" style="font-size:.62rem;padding:.4rem .5rem">${escHtml(t.note)}</div>` : ''}
      <div class="exam-test-card-actions">
        <button class="exam-icon-btn" onclick="openExamModal('${t.id}')">Edit</button>
        ${isOther ? '' : `<button class="exam-icon-btn" onclick="openExamAnalysisFor('${t.id}')">Paper Analysis</button>`}
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
    document.getElementById('examPassEnterHint').textContent = `${state.users[uid]?.name || 'This person'} has 
