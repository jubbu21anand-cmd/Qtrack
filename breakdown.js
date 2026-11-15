/* ═══ Paper In-Depth Breakdown — rule-based analysis, no AI/API needed. Data stays on this device. ═══ */
(function () {
const LS = 'qt_bd_v1', SUBS = ['Physics', 'Chemistry', 'Mathematics'];
const $ = id => document.getElementById(id);
const E = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let S = { qs: [], tags: {}, diff: 'moderate', sample: false, info: '', err: '' }, charts = [], POS = 4;
try { Object.assign(S, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };

/* ── tolerant reader: pdf2cbt export (JSON) or pasted CSV ── */
const nk = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const K = { id: ['questionid', 'qid', 'qno', 'questionno', 'questionnumber', 'id', 'no'], sec: ['section', 'sectionname', 'subject'],
  st: ['qstatus', 'status', 'questionstatus'], ya: ['youranswer', 'useranswer', 'selected', 'response', 'given'],
  ca: ['correctanswer', 'answerkey', 'key'], res: ['result', 'outcome', 'verdict'], mk: ['marks', 'marksobtained', 'marksawarded', 'score'],
  mx: ['maxmarks', 'totalmarks', 'outof', 'fullmarks'], tm: ['timespent', 'timetaken', 'timeinseconds', 'seconds', 'time'] };
const pick = (o, ns) => { const m = {}; for (const k in o) m[nk(k)] = o[k]; for (const n of ns) if (m[n] !== undefined && m[n] !== null && m[n] !== '') return m[n]; };
const num = v => { if (typeof v === 'number') return v; const m = String(v ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
const secs = v => { if (v == null || v === '') return NaN; if (typeof v === 'number') return v; const s = String(v);
  if (s.includes(':')) { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; } return num(s); };
function cls(o) {
  const r = String(pick(o, K.res) ?? '').toLowerCase().trim(), s = String(pick(o, K.st) ?? '').toLowerCase(), m = num(pick(o, K.mk));
  if (/^c$/.test(r)) return 'C'; if (/^w$/.test(r)) return 'W'; if (/^[us]$/.test(r)) return 'U';
  if (/partial/.test(r)) return 'P'; if (/drop|bonus/.test(r)) return 'D'; if (/incorrect|wrong/.test(r)) return 'W'; if (/correct|right/.test(r)) return 'C';
  if (/not\s?answered|unattempt|skip|not\s?visited|unanswered/.test(r + ' ' + s)) return 'U';
  if (m > 0) return 'C'; if (m < 0) return 'W'; return /^answered|attempted/.test(s) ? 'W' : 'U';
}
function find(root) {
  let best = [];
  (function w(x) {
    if (!x || typeof x !== 'object') return;
    let arr = Array.isArray(x) ? x : null;
    if (!arr) { const en = Object.entries(x); if (en.length > 4 && en.every(([, v]) => v && typeof v === 'object' && !Array.isArray(v))) arr = en.map(([k, v]) => ({ ...v, __qid: k })); }
    if (arr && arr.length >= 3 && arr.length > best.length &&
        arr.filter(v => v && typeof v === 'object' && [K.tm, K.res, K.st].some(ns => pick(v, ns) !== undefined)).length >= arr.length * .6) best = arr;
    (Array.isArray(x) ? x : Object.values(x)).forEach(w);
  })(root);
  return best;
}
function csv(t) {
  const L = t.trim().split(/\r?\n/).filter(x => x.trim()); if (!L.length) return [];
  const sp = l => l.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.trim().replace(/^"|"$/g, ''));
  let H = sp(L[0]); const known = Object.values(K).flat();
  if (H.some(h => known.includes(nk(h)))) L.shift(); else H = ['qid', 'section', 'result', 'timespent', 'marks'];
  return L.map(l => { const c = sp(l), o = {}; H.forEach((h, i) => o[h] = c[i]); return o; });
}
function toQs(arr) {
  const seen = new Set();
  return arr.map((o, i) => {
    const sec = String(pick(o, K.sec) ?? ''), mk = pick(o, K.mk); let mx = num(pick(o, K.mx));
    if (isNaN(mx) && typeof mk === 'string' && mk.includes('/')) mx = num(mk.split('/')[1]);
    let id = String(pick(o, K.id) ?? i + 1); if (seen.has(id)) id += '#' + (i + 1); seen.add(id);
    const m = num(mk), c = cls(o);
    return { id, n: i + 1, sub: /phy/i.test(sec) ? 'Physics' : /chem/i.test(sec) ? 'Chemistry' : /math/i.test(sec) ? 'Mathematics' : 'Other', c,
      mk: isNaN(m) ? 0 : m, mx, t: secs(pick(o, K.tm)) };
  });
}
function ingest(text) {
  let arr; try { arr = find(JSON.parse(text)); } catch (e) { arr = csv(text); }
  const qs = arr && arr.length >= 3 ? toQs(arr) : [];
  if (!qs.length) { S.err = 'Could not find question rows. Paste the first ~30 lines of the file to Claude so the reader can be adjusted.'; return render(); }
  const hit = Object.keys(K).filter(k => pick(arr[0], K[k]) !== undefined);
  Object.assign(S, { qs, tags: {}, sample: false, err: '', info: `Loaded ${qs.length} questions · fields recognised: ${hit.join(', ')}` });
  save(); render();
}
function makeSample() {
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280, qs = []; S.tags = {};
  SUBS.forEach(s => {
    const list = Object.keys(BD_DB[s]).slice(0, 8), skill = {}; list.forEach(c => skill[c] = .2 + rnd() * .75);
    for (let i = 0; i < 25; i++) {
      const c = list[i % 8], got = rnd() < skill[c], skip = !got && rnd() < .25, k = got ? 'C' : skip ? 'U' : 'W', id = s[0] + (i + 1);
      qs.push({ id, n: qs.length + 1, sub: s, c: k, mk: k === 'C' ? 4 : k === 'W' ? -1 : 0, mx: 4, t: Math.round((40 + rnd() * 160) * (got ? 1 : skip ? .3 : 1.15)) });
      S.tags[id] = s + '|' + c;
    }
  });
  Object.assign(S, { qs, sample: true, err: '', info: 'SAMPLE data — generated for preview, not a real paper.' }); save(); render();
}

/* ── analysis ── */
function agg(kf) {
  const m = {};
  S.qs.forEach(q => { const k = kf(q); if (!k) return;
    const a = m[k] || (m[k] = { k, n: 0, C: 0, W: 0, P: 0, U: 0, D: 0, tt: 0, tn: 0, got: 0, max: 0, lost: 0 }), mx = isNaN(q.mx) ? POS : q.mx;
    a.n++; a[q.c]++; if (!isNaN(q.t)) { a.tt += q.t; a.tn++; } a.got += q.mk; a.max += mx; a.lost += Math.max(0, mx - q.mk); });
  return Object.values(m).map(a => { a.att = a.C + a.W + a.P; a.acc = a.att ? a.C / a.att * 100 : null; a.avgT = a.tn ? a.tt / a.tn : null; return a; });
}
const status = a => a.att < 2 ? 'few' : a.acc >= 75 ? 'strong' : a.acc >= 50 ? 'watch' : 'weak';
const LBL = { strong: 'Strong', watch: 'Watch', weak: 'Weak', few: 'Too few Qs' }, nm = k => k.split('|')[1] || k;
const fT = s => s == null ? '–' : s >= 60 ? Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's' : Math.round(s) + 's';
const REF = { easy: [[90, 103], [95, 138], [98, 173], [99, 193]], tough: [[90, 73], [95, 108], [98, 143], [99, 163]] };
REF.moderate = REF.easy.map((p, i) => [p[0], (p[1] + REF.tough[i][1]) / 2]);
function pct(t, m) {
  if (m < t[0][1]) return 89; if (m >= t[3][1]) return 99.5;
  for (let i = 0; i < 3; i++) if (m < t[i + 1][1]) return t[i][0] + (t[i + 1][0] - t[i][0]) * (m - t[i][1]) / (t[i + 1][1] - t[i][1]);
}
const fP = v => v < 90 ? 'below 90' : v > 99 ? '99+' : v.toFixed(1);

function percentileCard(got, max) {
  const m = max ? got / max * 300 : 0, cur = pct(REF[S.diff], m), lo = pct(REF.easy, m), hi = pct(REF.tough, m);
  return `<div class="bd-card"><div class="bd-h">Estimated percentile <span class="bd-pill">seed data · low confidence</span></div>
  <div class="bd-big">≈ ${fP(cur)}</div><div class="bd-sub2">${S.diff} paper · range across easy → tough: ${fP(lo)} – ${fP(hi)}${Math.abs(max - 300) > 1 ? ` · marks scaled from ${max} to 300` : ''}</div>
  <div class="bd-note">Built from just two published April-2026 shift tables (coaching-institute estimates, not NTA official) covering the 90–99 percentile band only. Mocks have no real percentile, so treat this as "JEE-equivalent". The full Reddit-based table will replace it.</div></div>`;
}
function insights(sub, chap) {
  const L = [], tg = chap.filter(a => a.att >= 2), w = tg.filter(a => a.acc < 50).sort((a, b) => a.acc - b.acc).slice(0, 3), s = tg.filter(a => a.acc >= 75).sort((a, b) => b.acc - a.acc).slice(0, 2);
  const f = (a, k) => `${nm(a.k)} (${Math.round(a.acc)}%)`, qs = S.qs, att = qs.filter(q => 'CWP'.includes(q.c));
  if (w.length) L.push(`<b>Fix first:</b> ${w.map(f).join(', ')}.`);
  if (s.length) L.push(`<b>Strongest:</b> ${s.map(f).join(', ')} — keep them warm, don't over-invest.`);
  const top = chap.slice().sort((a, b) => b.lost - a.lost)[0]; if (top && top.lost > 0) L.push(`<b>Biggest mark leak:</b> ${nm(top.k)} cost ${top.lost} marks versus full credit.`);
  const av = x => { const t = qs.filter(q => q.c === x && !isNaN(q.t)).map(q => q.t); return t.length ? t.reduce((a, b) => a + b) / t.length : null; };
  const tC = av('C'), tW = av('W'), all = qs.filter(q => !isNaN(q.t)).map(q => q.t), tA = all.length ? all.reduce((a, b) => a + b) / all.length : 0;
  if (tC && tW) { if (tW < tC * .7) L.push(`<b>Rushing/guessing signal:</b> wrong answers took ${fT(tW)} on average vs ${fT(tC)} for correct ones.`);
    else if (tW > tC * 1.3) L.push(`<b>Time sink:</b> wrong answers took ${fT(tW)} vs ${fT(tC)} for correct ones — set a cut-off time and move on.`); }
  const sw = qs.filter(q => q.c === 'W' && q.t > tA * 1.5).length; if (sw) L.push(`<b>${sw} wrong answers</b> took more than 1.5× your average time.`);
  const ss = qs.filter(q => q.c === 'U' && q.t > tA).length; if (ss) L.push(`<b>${ss} skipped questions</b> still ate above-average time — decide to skip earlier.`);
  const neg = qs.reduce((a, q) => a + (q.mk < 0 ? -q.mk : 0), 0); if (neg) L.push(`<b>Negative marking</b> cost ${neg} marks across ${qs.filter(q => q.c === 'W').length} wrong answers.`);
  const ar = att.length / qs.length * 100, ac = att.length ? qs.filter(q => q.c === 'C').length / att.length * 100 : 0;
  if (ar < 70 && ac > 80) L.push('High accuracy but a low attempt rate — you can afford to attempt more.');
  if (ar > 85 && ac < 60) L.push('Attempting almost everything at low accuracy — be more selective.');
  return L;
}
function analysis() {
  const qs = S.qs, c = {}; qs.forEach(q => { if (q.c === 'C' && q.mk > 0) c[q.mk] = (c[q.mk] || 0) + 1; });
  POS = +Object.keys(c).sort((a, b) => c[b] - c[a])[0] || 4;
  const sub = agg(q => q.sub), chap = agg(q => S.tags[q.id]).sort((a, b) => b.lost - a.lost), T = agg(() => 'all')[0];
  const neg = qs.reduce((a, q) => a + (q.mk < 0 ? -q.mk : 0), 0), tile = (l, v, s) => `<div class="bd-tile"><div class="bd-tl">${l}</div><div class="bd-tv">${v}</div><div class="bd-ts">${s}</div></div>`;
  const tagged = qs.filter(q => S.tags[q.id]).length;
  let h = `<div class="bd-strip">${tile('Score', `${T.got}/${T.max}`, `${Math.round(T.got / T.max * 100)}% of full marks`)}${tile('Accuracy', T.acc == null ? '–' : Math.round(T.acc) + '%', `${T.C} ✓ · ${T.W} ✗ · ${T.U} skipped`)}
    ${tile('Attempted', `${T.att}/${T.n}`, `${Math.round(T.att / T.n * 100)}% attempt rate`)}${tile('Negative marks', '−' + neg, 'lost to wrong answers')}${tile('Time', fT(T.tt), `avg ${fT(T.avgT)} / question`)}</div>`;
  h += percentileCard(T.got, T.max);
  h += `<div class="bd-card"><div class="bd-h">Subject performance</div><div class="bd-tw"><table class="bd-t"><tr><th>Subject</th><th>Score</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th></tr>${sub.map(a => `<tr><td>${a.k}</td><td>${a.got}/${a.max}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td></tr>`).join('')}</table></div>
    <div class="bd-chart"><canvas id="bdSubChart"></canvas></div></div>`;
  h += `<div class="bd-card"><div class="bd-h">Chapter breakdown</div>`;
  h += !tagged ? `<div class="bd-note">Tag chapters in step 2 above to unlock this. Questions tagged so far: 0 of ${qs.length}.</div></div>` :
    `<div class="bd-tw"><table class="bd-t"><tr><th>Chapter</th><th>Qs</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th><th>Marks lost</th><th>Verdict</th></tr>${chap.map(a => {
      const st = status(a), topics = st === 'weak' ? (BD_DB[a.k.split('|')[0]] || {})[nm(a.k)] : '';
      return `<tr><td>${E(nm(a.k))}<div class="bd-sm">${a.k.split('|')[0]}${topics ? ' · revise: ' + E(topics.split(';').slice(0, 3).join(';')) : ''}</div></td><td>${a.n}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td><td>${a.lost}</td><td><span class="bd-chip ${st}">${LBL[st]}</span></td></tr>`; }).join('')}</table></div>
    <div class="bd-chart" style="height:${Math.max(180, chap.length * 26 + 40)}px"><canvas id="bdChapChart"></canvas></div>${tagged < qs.length ? `<div class="bd-note">${qs.length - tagged} questions are still untagged and left out of this table.</div>` : ''}</div>`;
  h += `<div class="bd-card"><div class="bd-h">Self-introspection <span class="bd-pill">rule-based</span></div><ul class="bd-ul">${insights(sub, chap).map(x => `<li>${x}</li>`).join('') || '<li>Not enough data yet.</li>'}</ul>
    <div class="bd-note">Peer comparison ("where others outscore you") unlocks once the Reddit dataset is loaded; until then comparisons are against your own paper only.</div></div>`;
  return { h, sub, chap };
}
function drawCharts(sub, chap) {
  if (typeof Chart === 'undefined') return; charts.forEach(c => c.destroy()); charts = [];
  const tick = { color: '#7d93b8' }, grid = { color: 'rgba(28,49,88,.7)' }, base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7d93b8', boxWidth: 10 } } } };
  const a = $('bdSubChart'); if (a) charts.push(new Chart(a, { type: 'bar', data: { labels: sub.map(x => x.k), datasets: [{ label: 'Scored', data: sub.map(x => x.got), backgroundColor: '#3b82f6' }, { label: 'Lost vs full', data: sub.map(x => x.lost), backgroundColor: '#1e3a6e' }] },
    options: { ...base, scales: { x: { ticks: tick, grid }, y: { ticks: tick, grid, beginAtZero: true } } } }));
  const b = $('bdChapChart'), cc = chap.filter(x => x.att); if (b && cc.length) { cc.sort((p, q) => p.acc - q.acc);
    charts.push(new Chart(b, { type: 'bar', data: { labels: cc.map(x => nm(x.k)), datasets: [{ label: 'Accuracy %', data: cc.map(x => Math.round(x.acc)), backgroundColor: cc.map(x => ({ strong: '#22c55e', watch: '#f5c842', weak: '#ef4444', few: '#475a7d' })[status(x)]) }] },
      options: { ...base, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid, min: 0, max: 100 }, y: { ticks: tick, grid } } } })); }
}

/* ── UI ── */
const opts = (s, sel) => '<option value="">— chapter —</option>' + (s === 'Other' ? SUBS : [s]).map(x => `<optgroup label="${x}">${Object.keys(BD_DB[x]).map(c => { const v = x + '|' + c; return `<option value="${E(v)}"${sel === v ? ' selected' : ''}>${E(c)}</option>`; }).join('')}</optgroup>`).join('');
function tagCard() {
  const un = S.qs.filter(q => !S.tags[q.id]).length;
  return `<details class="bd-card" ${un ? 'open' : ''}><summary class="bd-h">2 · Tag chapters <span class="bd-pill" id="bdPill">${S.qs.length - un}/${S.qs.length} tagged</span></summary>
  <div class="bd-note">One-time per paper, saved on this device. Pick a chapter per question, or fill a range at once (e.g. Q1 to Q8 = Kinematics).</div>
  ${SUBS.concat('Other').filter(s => S.qs.some(q => q.sub === s)).map(s => { const L = S.qs.filter(q => q.sub === s);
    return `<div class="bd-sub"><div class="bd-subh">${s} <span>${L.length} Qs</span></div>
    <div class="bd-bulk">Q <input id="bf_${s}" type="number" min="1" value="1"> to <input id="bt_${s}" type="number" min="1" value="${L.length}"><select id="bc_${s}">${opts(s)}</select><button class="bd-btn" onclick="bdBulk('${s}')">Apply</button></div>
    <div class="bd-qgrid">${L.map((q, i) => `<div class="bd-q"><span class="bd-dot ${q.c}" title="${q.c}"></span><b>${i + 1}</b><select onchange="bdTag('${encodeURIComponent(q.id)}',this.value)">${opts(s, S.tags[q.id])}</select></div>`).join('')}</div></div>`; }).join('')}</details>`;
}
function loadCard() {
  return `<div class="bd-card"><div class="bd-h">1 · Load your paper</div>
  <div class="bd-row"><label class="bd-btn bd-primary">Upload pdf2cbt export<input type="file" accept=".json,.csv,.txt" hidden onchange="bdFile(this)"></label><button class="bd-btn" onclick="bdSample()">Load sample</button>${S.qs.length ? '<button class="bd-btn" onclick="bdReset()">Clear</button>' : ''}</div>
  <textarea id="bdPaste" class="bd-ta" placeholder="…or paste the export JSON here, or CSV lines:  question, section, result (C/W/U), seconds"></textarea>
  <div class="bd-row"><button class="bd-btn" onclick="bdPasteGo()">Analyse pasted data</button></div>
  <div class="bd-h" style="margin-top:.9rem">Paper difficulty (your rating)</div>
  <div class="bd-row">${['easy', 'moderate', 'tough'].map(d => `<button class="bd-chipb ${S.diff === d ? 'active' : ''}" onclick="bdDiff('${d}')">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div>
  ${S.err ? `<div class="bd-note bd-err">${E(S.err)}</div>` : ''}${S.info ? `<div class="bd-note ${S.sample ? 'bd-warn' : ''}">${E(S.info)}</div>` : ''}</div>`;
}
function render() {
  const b = $('bdBody'); if (!b) return;
  b.innerHTML = loadCard() + (S.qs.length ? tagCard() + '<div id="bdAnalysis"></div>' : '<div class="bd-empty"><strong>No paper loaded</strong>Export your result from pdf2cbt (My Tests → Export), upload it above, or load the sample to preview.</div>');
  if (S.qs.length) renderAnalysis();
}
function renderAnalysis() { const el = $('bdAnalysis'); if (!el) return; const r = analysis(); el.innerHTML = r.h; drawCharts(r.sub, r.chap); }
Object.assign(window, {
  bdRender: render,
  bdFile(i) { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => ingest(String(r.result)); r.readAsText(f); },
  bdPasteGo() { const t = ($('bdPaste') || {}).value || ''; t.trim() ? ingest(t) : (S.err = 'Nothing pasted yet.', render()); },
  bdSample: makeSample,
  bdDiff(d) { S.diff = d; save(); render(); },
  bdTag(id, v) { id = decodeURIComponent(id); v ? S.tags[id] = v : delete S.tags[id]; save(); const p = $('bdPill'); if (p) p.textContent = `${S.qs.filter(q => S.tags[q.id]).length}/${S.qs.length} tagged`; renderAnalysis(); },
  bdBulk(s) { const v = $('bc_' + s).value; if (!v) return; const L = S.qs.filter(q => q.sub === s), a = +$('bf_' + s).value || 1, z = +$('bt_' + s).value || L.length;
    L.forEach((q, i) => { if (i + 1 >= a && i + 1 <= z) S.tags[q.id] = v; }); save(); render(); },
  bdReset() { if (confirm('Clear the loaded paper and its tags from this device?')) { S = { qs: [], tags: {}, diff: S.diff, sample: false, info: '', err: '' }; save(); render(); } },
  __bd: { ingest, agg, toQs, find, csv, pct, REF, S: () => S }
});
})();
