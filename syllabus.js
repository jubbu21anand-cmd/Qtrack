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

/* Weighted progress for a set of chapters: { pct, potential, earned, mastered, doing, todo, total,
   backlog, practiceTotal, avgPractice }.
   backlog: count of chapters flagged "in backlog" — purely a display overlay, never touches
   the pct formula (backlog is usually a subset of chapters that are behind schedule, so it
   overlays on top of the earned progress rather than subtracting from it).
   avgPractice: total questions practised ÷ chapters that actually HAVE a practice count logged
   (practice > 0). Chapters marked Theory/PYQ/Mastered with zero practice logged are excluded from
   the denominator too — a status change alone isn't practice, and counting it as "0 questions done"
   was dragging the average down even when the chapters you'd actually drilled averaged ~100 each. */
function sylComputeStats(uid, mode, subjKey, chapters) {
  let potential = 0, earned = 0, mastered = 0, doing = 0, todo = 0, total = 0, backlog = 0, practiceTotal = 0, practicedCount = 0;
  chapters.forEach(ch => {
    if (!sylClassMatch(ch.cls)) return;
    if (sylSearch && !ch.name.toLowerCase().includes(sylSearch.toLowerCase())) return;
    const w = PRIORITY_WEIGHT[ch.tier] || 1;
    const chKey = sylKey(ch.name);
    const st = sylChapterStatus(uid, mode, subjKey, chKey);
    potential += w; earned += w * STATUS_VALUE[st]; total++;
    if (st === 'mastered') mastered++;
    else if (st === 'pending') todo++;
    else doing++;
    if (sylChapterBacklog(uid, mode, subjKey, chKey)) backlog++;
    const p = sylChapterPractice(uid, mode, subjKey, chKey);
    practiceTotal += p;
    if (p > 0) practicedCount++;
  });
  return {
    pct: potential ? Math.round((earned / potential) * 1000) / 10 : 0,
    potential, earned, mastered, doing, todo, total, backlog, practiceTotal,
    avgPractice: practicedCount ? Math.round((practiceTotal / practicedCount) * 10) / 10 : 0,
    backlogPct: potential ? Math.round((chaptersBacklogWeight(uid, mode, subjKey, chapters) / potential) * 1000) / 10 : 0
  };
}
function chaptersBacklogWeight(uid, mode, subjKey, chapters) {
  let w = 0;
  chapters.forEach(ch => {
    if (!sylClassMatch(ch.cls)) return;
    if (sylChapterBacklog(uid, mode, subjKey, sylKey(ch.name))) w += PRIORITY_WEIGHT[ch.tier] || 1;
  });
  return w;
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
  // Per-subject avg practice (Physics/Chemistry/Maths or Biology, or custom subject names in Other mode)
  const perSubjPractice = subjects.map(s => ({ name: s.name, avgPractice: sylComputeStats(sylUid, sylMode, s.key, s.chapters).avgPractice }));

  let html = `
    <div class="syl-summary-card">
      <div class="syl-progress-big">${overall.pct}%</div>
      <div class="syl-progress-label">Covered${sylClassFilter !== 'both' ? ' · ' + sylClassFilter : ''}</div>
      <div class="syl-progress-bar-track">
        <div class="syl-progress-bar-fill" style="width:${overall.pct}%"></div>
        ${overall.backlogPct ? `<div class="syl-progress-bar-backlog" style="width:${overall.backlogPct}%" title="${overall.backlog} chapter(s) in backlog"></div>` : ''}
      </div>
      <div class="syl-stat-row">
        <div><div class="syl-stat-mini-label">Mastered</div><div class="syl-stat-mini-value">${overall.mastered}</div></div>
        <div><div class="syl-stat-mini-label">Doing</div><div class="syl-stat-mini-value">${overall.doing}</div></div>
        <div><div class="syl-stat-mini-label">To Do</div><div class="syl-stat-mini-value">${overall.todo}</div></div>
        ${overall.backlog ? `<div><div class="syl-stat-mini-label" style="color:var(--syl-red,#e5484d)">Backlog</div><div class="syl-stat-mini-value" style="color:var(--syl-red,#e5484d)">${overall.backlog}</div></div>` : ''}
      </div>
      <div class="syl-stat-row" style="margin-top:.35rem">
        <div><div class="syl-stat-mini-label">Avg Qs/Chapter</div><div class="syl-stat-mini-value">${overall.avgPractice}</div></div>
        <div><div class="syl-stat-mini-label">Total Practised</div><div class="syl-stat-mini-value">${overall.practiceTotal}</div></div>
      </div>
      ${perSubjPractice.length ? `<div class="syl-stat-row" style="margin-top:.35rem">
        ${perSubjPractice.map(s => `<div><div class="syl-stat-mini-label">${escHtml(s.name)} Avg Qs</div><div class="syl-stat-mini-value">${s.avgPractice}</div></div>`).join('')}
      </div>` : ''}
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
        <div class="syl-progress-panel-bar">
          <div class="syl-progress-panel-bar-fill" style="width:${st.pct}%"></div>
          ${st.backlogPct ? `<div class="syl-progress-bar-backlog" style="width:${st.backlogPct}%" title="${st.backlog} chapter(s) in backlog"></div>` : ''}
        </div>
        <div class="syl-progress-panel-stats">
          <div>Mastered: <b>${st.mastered}</b></div>
          <div>Doing: <b>${st.doing}</b></div>
          <div>To Do: <b>${st.todo}</b></div>
          ${st.backlog ? `<div style="color:var(--syl-red,#e5484d)">Backlog: <b>${st.backlog}</b></div>` : ''}
          <div>Avg Qs/Ch: <b>${st.avgPractice}</b></div>
        </div>
      </div>`;
    }).join('')}</div>`;
    html += sylFormulaBoxHTML();
    host.innerHTML = html;
    return;
  }

  html += `<div class="syl-subject-tabs">${subjects.map(s => {
    const st = sylComputeStats(sylUid, sylMode, s.key, s.chapters);
    return `<div class="syl-subject-tab ${s.key === sylSubjectKey ? 'active' : ''}" onclick="selectSylSubject('${escJs(s.key)}')">
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
  let potential = 0, earned = 0, mastered = 0, doing = 0, todo = 0, total = 0, backlog = 0, backlogW = 0, practiceTotal = 0, practicedCount = 0;
  chaptersWithSubj.forEach(ch => {
    if (!sylClassMatch(ch.cls)) return;
    const w = PRIORITY_WEIGHT[ch.tier] || 1;
    const chKey = sylKey(ch.name);
    const st = sylChapterStatus(sylUid, sylMode, ch.__subj, chKey);
    potential += w; earned += w * STATUS_VALUE[st]; total++;
    if (st === 'mastered') mastered++;
    else if (st === 'pending') todo++;
    else doing++;
    if (sylChapterBacklog(sylUid, sylMode, ch.__subj, chKey)) { backlog++; backlogW += w; }
    const p = sylChapterPractice(sylUid, sylMode, ch.__subj, chKey);
    practiceTotal += p;
    if (p > 0) practicedCount++;
  });
  return {
    pct: potential ? Math.round((earned / potential) * 1000) / 10 : 0,
    potential, earned, mastered, doing, todo, total, backlog, practiceTotal,
    avgPractice: practicedCount ? Math.round((practiceTotal / practicedCount) * 10) / 10 : 0,
    backlogPct: potential ? Math.round((backlogW / potential) * 1000) / 10 : 0
  };
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
        <div class="syl-group-head" onclick="toggleSylGroup('${escJs(gk)}')">
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
  const sk = escJs(subj.key), ck = escJs(chKey); // safe for embedding inside onclick='...' — see escJs
  return `
    <div class="syl-chapter-row">
      <div class="syl-chapter-top" onclick="toggleSylChapter('${sk}','${ck}')">
        <div class="syl-chapter-name"><span class="syl-status-dot ${backlog ? 'backlog' : status}"></span><span class="syl-chapter-name-text">${escHtml(ch.name)}</span></div>
        <div class="syl-chapter-meta">${ch.cls ? `<span class="syl-cls-tag">${ch.cls}</span>` : ''}<span class="syl-chevron ${open?'open':''}">▾</span></div>
      </div>
      ${open ? `
      <div class="syl-chapter-detail">
        <div class="syl-status-btns">
          ${['pending','theory','pyq','mastered'].map(s => `<button class="syl-status-btn ${status===s?'active':''}" onclick="setSylStatus('${sk}','${ck}','${s}')">${STATUS_LABEL[s]}</button>`).join('')}
        </div>
        <div class="syl-rev-row">
          <span class="syl-rev-label">Revisions</span>
          <div class="syl-rev-ctrl">
            <button class="syl-rev-btn" onclick="bumpSylRev('${sk}','${ck}',-1)">−</button>
            <span class="syl-rev-count">${revs}</span>
            <button class="syl-rev-btn" onclick="bumpSylRev('${sk}','${ck}',1)">+</button>
          </div>
        </div>
        <div class="syl-extra-btns">
          <button class="syl-extra-btn backlog ${backlog ? 'active' : ''}" onclick="toggleSylBacklog('${sk}','${ck}')">${backlog ? 'In Backlog' : 'Backlog'}</button>
          <button class="syl-extra-btn practice" onclick="promptAddSylPractice('${sk}','${ck}')">Practice<span class="syl-practice-count">${practice}</span></button>
        </div>
        <div class="syl-practice-hint">Practice count only ever goes up — enter how many more questions you did.</div>
        ${subj.custom ? `<button class="syl-btn-sm ghost" style="margin-top:.5rem" onclick="deleteSylChapter('${sk}','${escJs(ch.id)}')">Delete chapter</button>` : ''}
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

/* Practice count is intentionally irreversible — it can only ever be added to, never reduced,
   so it stays an honest running total of questions actually practised. The user enters how
   many MORE questions they did (a positive integer), which is added on top of the existing count. */
function promptAddSylPractice(subjKey, chKey) {
  const raw = window.prompt('How many more questions did you practise for this chapter? (whole number, e.g. 15)', '');
  if (raw === null) return; // cancelled
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0 || String(n) !== raw.trim()) {
    showToast('Enter a whole positive number');
    return;
  }
  addSylPractice(subjKey, chKey, n);
}
function addSylPractice(subjKey, chKey, addAmount) {
  const cur = state.syllabus.progress[sylUid]?.[sylMode]?.[subjKey]?.[chKey] || { status: 'pending', rev: 0, backlog: false, practice: 0 };
  const practice = (cur.practice || 0) + Math.max(0, Math.floor(addAmount)); // add-only — never subtracts
  doWrite(() => fbPut(sylProgressPath(subjKey, chKey), { status: cur.status || 'pending', rev: cur.rev || 0, backlog: !!cur.backlog, practice }))
    .then(ok => { if (ok) { renderSylBody(); showToast(`+${addAmount} logged`); } });
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

