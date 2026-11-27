/* ════════════════════════════════════════════════════════════
   REVISION PLANNER — data lives in revision-data.js
   Each topic stores a small number (bit-mask) per person:
   1=Revision 1, 2=Revision 2, 4=Revision 3, 8=PYQ, 16=Weak
════════════════════════════════════════════════════════════ */
let revUid = null, revSort = '', revOnly = false, revFaqFirst = false;
const revOpenCh = new Set(), revClosedSubj = new Set();
let revPending = {}, revTimer = null;
const REV_COLS = [['r1', 'Revision 1', 1], ['r2', 'Revision 2', 2], ['r3', 'Revision 3', 4], ['pyq', 'PYQ', 8], ['weak', 'Weak', 16]];
const REV_SUBJ = [['physics', 'Physics'], ['chemistry', 'Chemistry'], ['maths', 'Mathematics']];
const REV_COMBOS = { LEHY: 'High yield · Low effort', HEHY: 'High yield · High effort', LELY: 'Low yield · Low effort', HELY: 'Low yield · High effort' };
const REV_FLAME = `<svg class="rv-fire" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-.5-5 1-8z"/></svg>`;
const REV_BY_ID = {};
Object.values(REV_DATA).forEach(list => list.forEach(c => REV_BY_ID[c.id] = c));

function revKeys(ch) { return ch.g.flatMap(g => g[1].map(t => t[2])); }
function revNode(chId) { return ((((state.revision || {}).progress || {})[revUid]) || {})[chId] || {}; }
/* 0 = none ticked, 1 = some, 2 = all topics ticked for this column */
function revState(ch, bit) {
  const node = revNode(ch.id), keys = revKeys(ch);
  const n = keys.filter(k => (node[k] || 0) & bit).length;
  return n === 0 ? 0 : n === keys.length ? 2 : 1;
}
function revCell(st, onchange) {
  return `<label class="rv-cell" onclick="event.stopPropagation()"><input type="checkbox" ${st === 2 ? 'checked' : ''} ${st === 1 ? 'data-ind="1"' : ''} onchange="${onchange}"></label>`;
}

function renderRevisionPage() {
  const chips = document.getElementById('revChipRow'), ctl = document.getElementById('revControls'), body = document.getElementById('revBody');
  if (!chips || !body) return;
  const users = userList();
  if (!users.length) { chips.innerHTML = '<div class="rv-empty">Add a person on the Question Tracker page first.</div>'; ctl.innerHTML = ''; body.innerHTML = ''; return; }
  if (!revUid || !state.users[revUid]) revUid = users[0].id;
  chips.innerHTML = users.map(u => `<button class="rv-chip ${u.id === revUid ? 'active' : ''}" onclick="revSelectUser('${u.id}')">${escHtml(u.name)}</button>`).join('');
  ctl.innerHTML = `<div class="rv-controls">
    <select class="rv-select" onchange="revSetSort(this.value)">
      <option value="">Priority: syllabus order</option>
      ${Object.keys(REV_COMBOS).map(k => `<option value="${k}" ${revSort === k ? 'selected' : ''}>Bring to top: ${REV_COMBOS[k]}</option>`).join('')}
    </select>
    ${revSort ? `<button class="rv-pill ${revOnly ? 'on' : ''}" onclick="revToggleOnly()">Only this group</button>` : ''}
    <button class="rv-pill ${revFaqFirst ? 'on' : ''}" onclick="revToggleFaq()">${REV_FLAME} Frequently asked first</button>
  </div>`;
  body.innerHTML = REV_SUBJ.map(([sk, sn]) => revSubjectHTML(sk, sn)).join('');
  body.querySelectorAll('input[data-ind="1"]').forEach(i => i.indeterminate = true);
}

function revOrder(list) {
  let arr = list.map((c, i) => ({ c, i, faq: c.g.reduce((a, g) => a + g[1].filter(t => t[1]).length, 0) }));
  const hit = x => revSort && (x.c.e + 'E' + x.c.y + 'Y') === revSort;
  if (revSort && revOnly) arr = arr.filter(hit);
  arr.sort((a, b) => (hit(b) - hit(a)) || (revFaqFirst ? b.faq - a.faq : 0) || a.i - b.i);
  return arr.map(x => x.c);
}

function revSubjectHTML(sk, sn) {
  const chs = revOrder(REV_DATA[sk]);
  const closed = revClosedSubj.has(sk);
  const plain = !revSort && !revFaqFirst;
  let lastU = null, rows = '';
  if (!closed) chs.forEach(ch => {
    if (plain && ch.u && ch.u !== lastU) { rows += `<div class="rv-unit">${escHtml(ch.u)}</div>`; lastU = ch.u; }
    rows += revChapterHTML(ch);
  });
  return `<div class="rv-subject">
    <div class="rv-subj-head" onclick="revToggleSubj('${sk}')"><span class="rv-subj-name">${sn}</span><span class="rv-subj-count">${chs.length} chapters</span><span class="rv-chev ${closed ? '' : 'open'}">▾</span></div>
    ${closed ? '' : `<div class="rv-row rv-colhead"><div></div>${REV_COLS.map(c => `<div>${c[1]}</div>`).join('')}</div>${rows || '<div class="rv-empty">No chapters in this group.</div>'}`}
  </div>`;
}

function revChapterHTML(ch) {
  const open = revOpenCh.has(ch.id), hasFaq = ch.g.some(g => g[1].some(t => t[1]));
  let inner = '';
  if (open) ch.g.forEach(g => {
    const topics = revFaqFirst ? [...g[1].filter(t => t[1]), ...g[1].filter(t => !t[1])] : g[1];
    if (g[0]) inner += `<div class="rv-grp">${escHtml(g[0])}</div>`;
    topics.forEach(t => {
      const m = revNode(ch.id)[t[2]] || 0;
      inner += `<div class="rv-row rv-trow"><div class="rv-tname">${escHtml(t[0])}${t[1] ? REV_FLAME : ''}</div>${REV_COLS.map(c => revCell((m & c[2]) ? 2 : 0, `revTopicToggle('${ch.id}','${t[2]}',${c[2]},this.checked)`)).join('')}</div>`;
    });
  });
  return `<div class="rv-ch">
    <div class="rv-row rv-chrow" onclick="revToggleCh('${ch.id}')">
      <div class="rv-name"><span class="rv-chev ${open ? 'open' : ''}">▾</span><div><span class="rv-nm">${escHtml(ch.n)}</span>${hasFaq ? REV_FLAME : ''}
        <div class="rv-tags"><span>${ch.y === 'H' ? 'High' : 'Low'} yield</span><span>${ch.e === 'H' ? 'High' : 'Low'} effort</span></div></div></div>
      ${REV_COLS.map(c => revCell(revState(ch, c[2]), `revChapterToggle('${ch.id}',${c[2]},this.checked)`)).join('')}
    </div>${inner}</div>`;
}

function revSelectUser(uid) { revUid = uid; renderRevisionPage(); }
function revSetSort(v) { revSort = v; if (!v) revOnly = false; renderRevisionPage(); }
function revToggleOnly() { revOnly = !revOnly; renderRevisionPage(); }
function revToggleFaq() { revFaqFirst = !revFaqFirst; renderRevisionPage(); }
function revToggleCh(id) { revOpenCh.has(id) ? revOpenCh.delete(id) : revOpenCh.add(id); renderRevisionPage(); }
function revToggleSubj(k) { revClosedSubj.has(k) ? revClosedSubj.delete(k) : revClosedSubj.add(k); renderRevisionPage(); }
/* ticking a chapter box ticks (or clears) every topic inside it */
function revChapterToggle(chId, bit, on) { revSet(chId, revKeys(REV_BY_ID[chId]), bit, on); }
function revTopicToggle(chId, key, bit, on) { revSet(chId, [key], bit, on); }

function revSet(chId, keys, bit, on) {
  if (!state.revision) state.revision = { progress: {} };
  const p = state.revision.progress = state.revision.progress || {};
  const u = p[revUid] = p[revUid] || {};
  const node = u[chId] = u[chId] || {};
  keys.forEach(k => { let m = node[k] || 0; m = on ? (m | bit) : (m & ~bit); if (m) node[k] = m; else delete node[k]; });
  if (!Object.keys(node).length) delete u[chId];
  revPending[revUid + '|' + chId] = 1;
  clearTimeout(revTimer); revTimer = setTimeout(revFlush, 700);   // saved shortly after you stop ticking
  saveLocal(); renderRevisionPage();
}

async function revFlush() {
  clearTimeout(revTimer);
  if (isWriting) { revTimer = setTimeout(revFlush, 500); return; }
  const keys = Object.keys(revPending); if (!keys.length) return;
  revPending = {}; isWriting = true; setSyncStatus('saving');
  try {
    for (const k of keys) {
      const [uid, ch] = k.split('|');
      const node = ((((state.revision || {}).progress || {})[uid]) || {})[ch];
      if (node && Object.keys(node).length) await fbPut(`/revision/progress/${uid}/${ch}`, node);
      else await fbDelete(`/revision/progress/${uid}/${ch}`);
    }
    await bumpMeta(); setSyncStatus('ok');
  } catch (e) {
    console.error('Revision save failed:', e); setSyncStatus('error');
    keys.forEach(k => revPending[k] = 1); revTimer = setTimeout(revFlush, 4000);
  } finally { isWriting = false; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && Object.keys(revPending).length) revFlush(); });
