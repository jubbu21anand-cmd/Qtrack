/* ═══ Paper In-Depth Breakdown — rule-based analysis, no AI/API needed. Data stays on this device. ═══ */
(function () {
const LS = 'qt_bd_v1', SUBS = ['Physics', 'Chemistry', 'Mathematics'];
const $ = id => document.getElementById(id);
const E = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
let S = { qs: [], tags: {}, diff: 'moderate', sample: false, info: '', err: '', topics: {}, tagMsg: '', tagWarn: false }, charts = [], POS = 4;
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
  Object.assign(S, { qs, tags: {}, topics: {}, tagMsg: '', sample: false, err: '', info: `Loaded ${qs.length} questions · fields recognised: ${hit.join(', ')}` });
  save(); render();
}
function makeSample() {
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280, qs = []; S.tags = {}; S.topics = {}; S.tagMsg = '';
  SUBS.forEach(s => {
    const list = Object.keys(BD_DB[s]).slice(0, 8), skill = {}; list.forEach(c => skill[c] = .2 + rnd() * .75);
    for (let i = 0; i < 25; i++) {
      const c = list[i % 8], got = rnd() < skill[c], skip = !got && rnd() < .25, k = got ? 'C' : skip ? 'U' : 'W', id = s[0] + (i + 1);
      qs.push({ id, n: qs.length + 1, sub: s, c: k, mk: k === 'C' ? 4 : k === 'W' ? -1 : 0, mx: 4, t: Math.round((40 + rnd() * 160) * (got ? 1 : skip ? .3 : 1.15)) });
      S.tags[id] = s + '|' + c; S.topics[id] = BD_DB[s][c].split(';')[i % 3].trim();
    }
  });
  Object.assign(S, { qs, sample: true, err: '', info: 'SAMPLE data — generated for preview, not a real paper.' }); save(); render();
}

/* ── analysis ── */
let TA = 60;
function agg(kf) {
  const m = {};
  S.qs.forEach(q => { const k = kf(q); if (!k) return;
    const a = m[k] || (m[k] = { k, n: 0, C: 0, W: 0, P: 0, U: 0, D: 0, tt: 0, tn: 0, got: 0, max: 0, lost: 0, neg: 0, fW: 0, sW: 0 }), mx = isNaN(q.mx) ? POS : q.mx;
    a.n++; a[q.c]++; if (!isNaN(q.t)) { a.tt += q.t; a.tn++; } a.got += q.mk; a.max += mx; a.lost += Math.max(0, mx - q.mk); if (q.mk < 0) a.neg -= q.mk;
    if (q.c === 'W' && !isNaN(q.t)) { if (q.t < TA * .6) a.fW++; else if (q.t > TA * 1.5) a.sW++; } });
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

const f1 = v => Math.min(v, 100).toFixed(1);
const BELOW = `<b>Below 90 isn’t final.</b> Your marks fall under the 90th-percentile mark in our reference tables, so we can’t give a number — and that’s okay. One paper is a snapshot, not a verdict. Revise the weak chapters listed below, redo the questions you got wrong, and come back stronger. Most gains at this stage come from fixing a few chapters and cutting silly mistakes.`;
function pInfo(g, mx) { const m = mx ? g / mx * 300 : 0, cur = pct(REF[S.diff], m), lo = pct(REF.easy, m), hi = pct(REF.tough, m); return { m, cur, lo, hi, low: cur < 90 }; }
function predCard(T) {
  const p = pInfo(T.got, T.max);
  return `<div class="bd-card"><div class="bd-h">Predictive percentile ${hq('pred')}<span class="bd-pill">${S.diff} paper</span></div>${hp('pred')}
  ${p.low ? `<div class="bd-msg">${BELOW}</div>` : `<div class="bd-big">≈ ${f1(p.cur)}</div><div class="bd-sub2">for a ${S.diff} paper · if it were easy → tough: ${p.lo < 90 ? 'below 90' : f1(p.lo)} – ${f1(p.hi)}${Math.abs(T.max - 300) > 1 ? ` · marks scaled from ${T.max} to 300` : ''}</div>`}
  <div class="bd-note">Built from two published April-2026 shift tables (coaching-institute estimates, not NTA official) covering the 90–99 band only. A mock has no real percentile — read this as “JEE-equivalent”.</div></div>`;
}
function rangeCard(T) {
  const p = pInfo(T.got, T.max), w = Math.min(4, Math.max(3, (p.hi - p.lo) / 2));
  return `<div class="bd-card"><div class="bd-h">Estimated percentile ${hq('range')}<span class="bd-pill">most likely band</span></div>${hp('range')}
  ${p.low ? `<div class="bd-msg">${BELOW}</div>` : `<div class="bd-big">${f1(Math.max(90, p.cur - w))} – ${f1(p.cur + w)}</div><div class="bd-sub2">best single guess ≈ ${f1(p.cur)} · band ±${w.toFixed(1)}${p.cur - w < 90 ? ' · lower end held at 90, the lowest value we can estimate' : ''}</div>`}
  <div class="bd-note">The band widens (up to ±4) when the easy and tough tables disagree about your marks. It is a design choice for the most realistic range from limited data, not a measured accuracy.</div></div>`;
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
/* ── help (the “?” buttons) ── */
const HELP = {
  load: `<b>How to bring your paper in</b><ol><li>Open pdf2cbt and go to <b>Test Results → My Tests</b> (left menu).</li><li>Tap your test, then tap <b>Export</b>. A small <code>.json</code> file downloads.</li><li>Come back here and tap <b>Upload pdf2cbt export</b>, then pick that file. <i>Or</i> open the file, select everything, copy it, paste it in the box and tap <b>Analyse pasted data</b>.</li></ol>No pdf2cbt? Paste one line per question: <code>1, Physics, C, 85</code> = question, subject, result (C right / W wrong / U skipped), seconds spent.<br>If it says it can’t read your file, send the first 30 lines of it to the developer.<br><br><b>Paper difficulty:</b> rate how hard the paper felt against a real JEE Main. Tough papers give a higher percentile for the same marks.`,
  tag: `<b>Let ChatGPT sort the questions for you (no manual tagging)</b><ol><li>Tap <b>Copy prompt</b>.</li><li>Open ChatGPT. Attach your question paper (PDF or screenshots) and paste the prompt. Send.</li><li>ChatGPT replies with one line per question, like <code>Physics | Kinematics | Projectile motion</code>.</li><li>Copy its reply (or the text file it gives), paste it in the box here and tap <b>Apply chapters</b>.</li></ol>It’s fine if ChatGPT adds extra words — lines in the wrong format are ignored. If the numbers don’t match, ask ChatGPT: “give exactly the right number of lines, one per question”. Tagging is saved on this device.`,
  pred: `One best-guess percentile from your marks and your difficulty rating. It comes from published shift tables, so treat it as a guide, not a result.`,
  range: `Your percentile is never one exact number, so this shows the most likely band (about ±3–4 points). The band is wider when the easy and tough tables disagree about your marks.`,
  subj: `Blue = marks you scored in each subject. Red = marks lost (full marks minus what you scored, so wrong answers and skipped questions both count).`,
  chap: `Every chapter you tagged. <b>Accuracy</b> = right ÷ attempted. <b>Strong</b> ≥75%, <b>Watch</b> 50–75%, <b>Weak</b> &lt;50% (needs at least 2 attempted questions). <b>Marks lost</b> = full marks minus scored.`,
  intro: `A deeper look at <i>how</i> you took the paper. <b>Pace</b> = your time per question vs your paper average. <b>Fast ✗</b> = wrong in under 60% of your average time (likely rushed or a silly slip). <b>Slow ✗</b> = wrong after more than 1.5× the average (stuck, then still wrong). <b>Position</b> shows whether your accuracy dropped towards the end of each section. Q labels like <b>P12</b> mean Physics question 12 (C = Chemistry, M = Maths).`
};
const hq = id => `<button class="bd-qm" onclick="bdHelp('${id}',event)" aria-label="Help">?</button>`, hp = id => `<div class="bd-help" id="bdh_${id}" style="display:none">${HELP[id]}</div>`;

/* ── ChatGPT tagging: prompt out, reply in ── */
function buildPrompt() {
  const cnt = {}; S.qs.forEach(q => cnt[q.sub] = (cnt[q.sub] || 0) + 1);
  const lines = Object.entries(cnt).map(([k, n]) => `- ${k === 'Other' ? 'Total' : k}: ${n} questions`).join('\n');
  return `You are a JEE expert. I am attaching a question paper. For EVERY question, tell me its subject, chapter and topic.

Questions in this paper:
${lines}

Rules:
1. Output exactly ONE line per question, going subject by subject in the order the questions appear in the paper.
2. Line format (use the | symbol): Subject | Chapter | Topic
3. Subject must be Physics, Chemistry or Mathematics.
4. Chapter MUST be copied exactly from this list for that subject:
${SUBS.map(k => `${k}: ${Object.keys(BD_DB[k]).join(' | ')}`).join('\n')}
5. Topic: 2–4 words of your choice. If a question mixes chapters, choose the main one.
6. If you cannot read a question, write: Subject | Unknown | Unknown
7. No numbering, no headings, no explanations, no blank lines — only the lines. Give the final answer as plain text.`;
}
const subOf = x => /phy/i.test(x) ? 'Physics' : /chem/i.test(x) ? 'Chemistry' : /math/i.test(x) ? 'Mathematics' : null;
function matchCh(sb, txt) {
  const n = nk(txt); if (!n || n === 'unknown') return null; const keys = Object.keys(BD_DB[sb]);
  let hit = keys.find(c => nk(c) === n) || keys.find(c => n.length >= 4 && (nk(c).includes(n) || n.includes(nk(c))));
  if (hit) return sb + '|' + hit;
  const tk = x => new Set(String(x).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2)), a = tk(txt); let best = 0;
  keys.forEach(c => { const b = tk(c), i = [...a].filter(w => b.has(w)).length, sc = i / new Set([...a, ...b]).size; if (sc > best) { best = sc; hit = c; } });
  return best >= .5 ? sb + '|' + hit : null;
}
function applyTags(text) {
  const rows = [];
  text.split(/\r?\n/).forEach(l => {
    l = l.replace(/[*`]/g, '').replace(/^\s*(\d+\s*[.):]\s*|[-•>]\s*)/, '').trim(); if (!l.includes('|')) return;
    const p = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim()), sb = subOf(p[0]); if (!sb) return;
    rows.push({ s: sb, c: matchCh(sb, p[1] || ''), t: p[2] || '', raw: p[1] || '?' });
  });
  if (!rows.length) { S.tagMsg = 'No usable lines found. Each line must look like: Physics | Kinematics | Projectile motion'; S.tagWarn = true; return render(); }
  const other = S.qs.some(q => q.sub === 'Other'), by = {}, idx = {}, bad = new Set(); let ok = 0;
  rows.forEach(r => (by[r.s] = by[r.s] || []).push(r));
  S.qs.forEach((q, i) => {
    let r; if (other) { r = rows[i]; if (r) q.sub = r.s; } else { const k = idx[q.sub] = idx[q.sub] || 0; idx[q.sub]++; r = (by[q.sub] || [])[k]; }
    if (!r) return; if (r.c) { S.tags[q.id] = r.c; S.topics[q.id] = r.t; ok++; } else bad.add(r.raw);
  });
  const cnt = {}; S.qs.forEach(q => cnt[q.sub] = (cnt[q.sub] || 0) + 1);
  const off = Object.keys(cnt).filter(k => (by[k] || []).length !== cnt[k]).map(k => `${k}: paper has ${cnt[k]}, reply had ${(by[k] || []).length}`);
  S.tagMsg = `Tagged ${ok} of ${S.qs.length} questions.` + (off.length ? ` ⚠ Line counts differ — ${off.join('; ')}. Ask ChatGPT for exactly one line per question.` : '') + (bad.size ? ` Unrecognised chapter names: ${[...bad].slice(0, 6).join(', ')} — fix these under “Fix or tag manually”.` : '');
  S.tagWarn = !!(off.length || bad.size); save(); render();
}

/* ── cards ── */
function subjCard(sub) {
  return `<div class="bd-card"><div class="bd-h">Subject performance ${hq('subj')}</div>${hp('subj')}<div class="bd-tw"><table class="bd-t"><tr><th>Subject</th><th>Score</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th></tr>${sub.map(a => `<tr><td>${a.k}</td><td>${a.got}/${a.max}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td></tr>`).join('')}</table></div>
  <div class="bd-chart"><canvas id="bdSubChart"></canvas></div></div>`;
}
function chapCard(chap, tagged) {
  const head = `<div class="bd-card"><div class="bd-h">Chapter breakdown ${hq('chap')}</div>${hp('chap')}`;
  if (!tagged) return head + `<div class="bd-note">Tag your chapters in step 2 above to unlock this (0 of ${S.qs.length} tagged).</div></div>`;
  return head + `<div class="bd-tw"><table class="bd-t"><tr><th>Chapter</th><th>Qs</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th><th>Marks lost</th><th>Verdict</th></tr>${chap.map(a => {
    const st = status(a), tp = st === 'weak' ? (BD_DB[a.k.split('|')[0]] || {})[nm(a.k)] : '';
    return `<tr><td>${E(nm(a.k))}<div class="bd-sm">${a.k.split('|')[0]}${tp ? ' · revise: ' + E(tp.split(';').slice(0, 3).join(';')) : ''}</div></td><td>${a.n}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td><td>${a.lost}</td><td><span class="bd-chip ${st}">${LBL[st]}</span></td></tr>`; }).join('')}</table></div>
  <div class="bd-chart" style="height:${Math.max(180, chap.length * 26 + 40)}px"><canvas id="bdChapChart"></canvas></div>${tagged < S.qs.length ? `<div class="bd-note">${S.qs.length - tagged} untagged questions are left out of this table.</div>` : ''}</div>`;
}
function introCard(sub, chap, T) {
  const qs = S.qs, lab = {}, cn = {}; qs.forEach(q => { cn[q.sub] = (cn[q.sub] || 0) + 1; lab[q.id] = q.sub[0] + cn[q.sub]; });
  const fast = q => q.c === 'W' && !isNaN(q.t) && q.t < TA * .6, mxo = q => isNaN(q.mx) ? POS : q.mx, chn = q => S.tags[q.id] ? nm(S.tags[q.id]) : '—', oc = { C: '✓', W: '✗', U: 'skipped', P: 'partial', D: 'dropped' };
  const pace = a => a.avgT == null ? '–' : Math.abs(a.avgT / TA - 1) < .15 ? '≈ same' : a.avgT > TA ? `▲ ${Math.round((a.avgT / TA - 1) * 100)}% slower` : `▼ ${Math.round((1 - a.avgT / TA) * 100)}% faster`;
  const act = { weak: 'Relearn theory, then 20+ PYQs', watch: 'Mixed practice; hunt silly errors', strong: 'Timed practice to stay sharp', few: 'Too few questions to judge' };
  const mt = a => !a.W ? '–' : a.fW > a.sW * 1.5 ? 'Mostly rushed' : a.sW > a.fW * 1.5 ? 'Mostly stuck' : a.fW + a.sW ? 'Mixed' : 'Normal pace';
  const tbl = (hd, rows) => `<div class="bd-tw"><table class="bd-t"><tr>${hd.map(x => `<th>${x}</th>`).join('')}</tr>${rows}</table></div>`;
  let h = `<div class="bd-card"><div class="bd-h">Self-introspection ${hq('intro')}<span class="bd-pill">rule-based</span></div>${hp('intro')}<ul class="bd-ul">${insights(sub, chap).map(x => `<li>${x}</li>`).join('') || '<li>Not enough data yet.</li>'}</ul>`;
  const qf = qs.filter(fast), rec = qf.reduce((a, q) => a + Math.max(0, mxo(q) - q.mk), 0);
  if (rec) { const pp = pInfo(T.got + rec, T.max); h += `<div class="bd-msg good">Potential score: if your <b>${qf.length} quick-fix mistakes</b> (wrong, answered fast) had been right, you’d have <b>${T.got + rec}/${T.max}</b>${pp.low ? '' : ' ≈ ' + f1(pp.cur) + ' percentile'}.</div>`; }
  if (chap.length) h += `<div class="bd-sh">Chapter diagnosis</div>` + tbl(['Chapter', 'Attempt', 'Acc.', 'Pace', 'Neg. marks', 'Fast ✗', 'Slow ✗', 'Marks lost', 'Mistake type', 'Next step'], chap.map(a => { const st = status(a);
    return `<tr><td>${E(nm(a.k))}</td><td>${Math.round(a.att / a.n * 100)}%</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${pace(a)}</td><td>${a.neg ? '−' + a.neg : 0}</td><td>${a.fW}</td><td>${a.sW}</td><td>${a.lost}</td><td>${mt(a)}</td><td><span class="bd-chip ${st}">${act[st]}</span></td></tr>`; }).join(''));
  h += `<div class="bd-sh">Subject efficiency</div>` + tbl(['Subject', 'Time share', 'Marks share', 'Marks / min', 'Fast ✗', 'Slow ✗', 'Skipped after long time'], sub.map(a => `<tr><td>${a.k}</td><td>${T.tt ? Math.round(a.tt / T.tt * 100) : 0}%</td><td>${T.got > 0 ? Math.round(a.got / T.got * 100) + '%' : '–'}</td><td>${a.tt ? (a.got / (a.tt / 60)).toFixed(2) : '–'}</td><td>${a.fW}</td><td>${a.sW}</td><td>${qs.filter(q => q.sub === a.k && q.c === 'U' && q.t > TA).length}</td></tr>`).join(''));
  const Q = [0, 1, 2, 3].map(() => ({ n: 0, C: 0, W: 0, P: 0, U: 0, D: 0, tt: 0, tn: 0 }));
  SUBS.concat('Other').forEach(k => { const L = qs.filter(q => q.sub === k); L.forEach((q, i) => { const b = Q[Math.min(3, Math.floor(i * 4 / L.length))]; b.n++; b[q.c]++; if (!isNaN(q.t)) { b.tt += q.t; b.tn++; } }); });
  h += `<div class="bd-sh">Position in each section</div>` + tbl(['Part of section', 'Attempt rate', 'Accuracy', 'Avg time'], Q.map((b, i) => { const at = b.C + b.W + b.P; return `<tr><td>${['First quarter', 'Second quarter', 'Third quarter', 'Last quarter'][i]}</td><td>${b.n ? Math.round(at / b.n * 100) + '%' : '–'}</td><td>${at ? Math.round(b.C / at * 100) + '%' : '–'}</td><td>${fT(b.tn ? b.tt / b.tn : null)}</td></tr>`; }).join(''));
  const li = a => a.map(q => `<li><b>${lab[q.id]}</b> · ${fT(q.t)} · ${oc[q.c]} · ${chn(q)}</li>`).join('') || '<li>None</li>';
  h += `<div class="bd-two"><div><div class="bd-sh">Biggest time sinks</div><ul class="bd-ul">${li(qs.filter(q => !isNaN(q.t)).sort((a, b) => b.t - a.t).slice(0, 6))}</ul></div><div><div class="bd-sh">Quick-fix mistakes (wrong, fast)</div><ul class="bd-ul">${li(qf.slice(0, 8))}</ul></div></div>`;
  const tp = {}; qs.forEach(q => { const t = S.topics[q.id]; if (!t || q.c === 'C') return; const k = (S.tags[q.id] || '') + '§' + t, a = tp[k] || (tp[k] = { t, c: chn(q), W: 0, U: 0, P: 0 }); a[q.c === 'D' ? 'U' : q.c]++; });
  const tr = Object.values(tp).sort((a, b) => (b.W * 2 + b.P + b.U) - (a.W * 2 + a.P + a.U)).slice(0, 12);
  if (tr.length) h += `<div class="bd-sh">Topic hot-list (where you dropped marks)</div>` + tbl(['Topic', 'Chapter', '✗ Wrong', 'Skipped'], tr.map(a => `<tr><td>${E(a.t)}</td><td>${E(a.c)}</td><td>${a.W + a.P}</td><td>${a.U}</td></tr>`).join(''));
  return h + `<div class="bd-note">Peer comparison (“where others outscore you”) unlocks once the Reddit dataset is loaded; until then everything here compares you against your own paper.</div></div>`;
}
function analysis() {
  const qs = S.qs, cm = {}; qs.forEach(q => { if (q.c === 'C' && q.mk > 0) cm[q.mk] = (cm[q.mk] || 0) + 1; });
  POS = +Object.keys(cm).sort((a, b) => cm[b] - cm[a])[0] || 4;
  const ts = qs.filter(q => !isNaN(q.t)).map(q => q.t); TA = ts.length ? ts.reduce((a, b) => a + b) / ts.length : 60;
  const sub = agg(q => q.sub), chap = agg(q => S.tags[q.id]).sort((a, b) => b.lost - a.lost), T = agg(() => 'all')[0], tagged = qs.filter(q => S.tags[q.id]).length;
  const tile = (l, v, x) => `<div class="bd-tile"><div class="bd-tl">${l}</div><div class="bd-tv">${v}</div><div class="bd-ts">${x}</div></div>`;
  const strip = `<div class="bd-strip">${tile('Score', `${T.got}/${T.max}`, `${Math.round(T.got / T.max * 100)}% of full marks`)}${tile('Accuracy', T.acc == null ? '–' : Math.round(T.acc) + '%', `${T.C} ✓ · ${T.W} ✗ · ${T.U} skipped`)}${tile('Attempted', `${T.att}/${T.n}`, `${Math.round(T.att / T.n * 100)}% attempt rate`)}${tile('Negative marks', '−' + T.neg, 'lost to wrong answers')}${tile('Time', fT(T.tt), `avg ${fT(T.avgT)} / question`)}</div>`;
  return { h: strip + predCard(T) + rangeCard(T) + subjCard(sub) + chapCard(chap, tagged) + introCard(sub, chap, T), sub, chap };
}
function drawCharts(sub, chap) {
  if (typeof Chart === 'undefined') return; charts.forEach(c => c.destroy()); charts = [];
  const tick = { color: '#7d93b8' }, grid = { color: 'rgba(28,49,88,.7)' }, base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#7d93b8', boxWidth: 10 } } } };
  const a = $('bdSubChart'); if (a) charts.push(new Chart(a, { type: 'bar', data: { labels: sub.map(x => x.k), datasets: [{ label: 'Marks scored', data: sub.map(x => x.got), backgroundColor: '#3b82f6' }, { label: 'Marks lost', data: sub.map(x => x.lost), backgroundColor: '#ef4444' }] },
    options: { ...base, scales: { x: { ticks: tick, grid, stacked: false }, y: { ticks: tick, grid, beginAtZero: true, stacked: false } } } }));
  const b = $('bdChapChart'), cc = chap.filter(x => x.att); if (b && cc.length) { cc.sort((p, q) => p.acc - q.acc);
    charts.push(new Chart(b, { type: 'bar', data: { labels: cc.map(x => nm(x.k)), datasets: [{ label: 'Accuracy %', data: cc.map(x => Math.round(x.acc)), backgroundColor: cc.map(x => ({ strong: '#22c55e', watch: '#f5c842', weak: '#ef4444', few: '#475a7d' })[status(x)]) }] },
      options: { ...base, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid, min: 0, max: 100 }, y: { ticks: tick, grid } } } })); }
}

/* ── UI ── */
const opts = (sb, sel) => '<option value="">— chapter —</option>' + (sb === 'Other' ? SUBS : [sb]).map(x => `<optgroup label="${x}">${Object.keys(BD_DB[x]).map(c => { const v = x + '|' + c; return `<option value="${E(v)}"${sel === v ? ' selected' : ''}>${E(c)}</option>`; }).join('')}</optgroup>`).join('');
function manual() {
  return SUBS.concat('Other').filter(k => S.qs.some(q => q.sub === k)).map(k => { const L = S.qs.filter(q => q.sub === k);
    return `<div class="bd-subh">${k} <span>${L.length} Qs</span></div><div class="bd-bulk">Q <input id="bf_${k}" type="number" min="1" value="1"> to <input id="bt_${k}" type="number" min="1" value="${L.length}"><select id="bc_${k}">${opts(k)}</select><button class="bd-btn" onclick="bdBulk('${k}')">Apply</button></div>
    <div class="bd-qgrid">${L.map((q, i) => `<div class="bd-q"><span class="bd-dot ${q.c}"></span><b>${i + 1}</b><select onchange="bdTag('${encodeURIComponent(q.id)}',this.value)">${opts(k, S.tags[q.id])}</select></div>`).join('')}</div>`; }).join('');
}
function tagStep() {
  const done = S.qs.filter(q => S.tags[q.id]).length;
  return `<div class="bd-card"><div class="bd-h">2 · Auto-tag chapters with ChatGPT ${hq('tag')}<span class="bd-pill" id="bdPill">${done}/${S.qs.length} tagged</span></div>${hp('tag')}
  <div class="bd-step"><b>A.</b> Copy this prompt <button class="bd-btn bd-primary" id="bdCopyBtn" onclick="bdCopy()">Copy prompt</button></div>
  <textarea id="bdPrompt" class="bd-ta" readonly>${E(buildPrompt())}</textarea>
  <div class="bd-step"><b>B.</b> Give ChatGPT the prompt + your question paper, then paste its reply here:</div>
  <textarea id="bdTagPaste" class="bd-ta" placeholder="Physics | Kinematics | Projectile motion&#10;Physics | Laws of Motion | Friction&#10;…"></textarea>
  <div class="bd-row"><button class="bd-btn bd-primary" onclick="bdApplyTags()">Apply chapters</button></div>
  ${S.tagMsg ? `<div class="bd-note ${S.tagWarn ? 'bd-warn' : ''}">${E(S.tagMsg)}</div>` : ''}
  <details class="bd-fix"><summary>Fix or tag manually (optional)</summary>${manual()}</details></div>`;
}
function loadCard() {
  return `<div class="bd-card"><div class="bd-h">1 · Load your paper ${hq('load')}</div>${hp('load')}
  <div class="bd-row"><label class="bd-btn bd-primary">Upload pdf2cbt export<input type="file" accept=".json,.csv,.txt" hidden onchange="bdFile(this)"></label><button class="bd-btn" onclick="bdSample()">Load sample</button>${S.qs.length ? '<button class="bd-btn" onclick="bdReset()">Clear</button>' : ''}</div>
  <textarea id="bdPaste" class="bd-ta" placeholder="…or paste the export JSON here, or CSV lines:  question, section, result (C/W/U), seconds"></textarea>
  <div class="bd-row"><button class="bd-btn" onclick="bdPasteGo()">Analyse pasted data</button></div>
  <div class="bd-h" style="margin-top:.9rem">Paper difficulty (your rating)</div>
  <div class="bd-row">${['easy', 'moderate', 'tough'].map(d => `<button class="bd-chipb ${S.diff === d ? 'active' : ''}" onclick="bdDiff('${d}')">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div>
  ${S.err ? `<div class="bd-note bd-err">${E(S.err)}</div>` : ''}${S.info ? `<div class="bd-note ${S.sample ? 'bd-warn' : ''}">${E(S.info)}</div>` : ''}</div>`;
}
function render() {
  const b = $('bdBody'); if (!b) return;
  b.innerHTML = loadCard() + (S.qs.length ? tagStep() + '<div id="bdAnalysis"></div>' : '<div class="bd-empty"><strong>No paper loaded</strong>Export your result from pdf2cbt (My Tests → Export), upload it above, or load the sample to preview. Tap the ? on any card for help.</div>');
  if (S.qs.length) renderAnalysis();
}
function renderAnalysis() { const el = $('bdAnalysis'); if (!el) return; const r = analysis(); el.innerHTML = r.h; drawCharts(r.sub, r.chap); }
Object.assign(window, {
  bdRender: render,
  bdHelp(id, ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); } const el = $('bdh_' + id); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; },
  bdCopy() { const t = $('bdPrompt'), done = () => { const b = $('bdCopyBtn'); if (b) { b.textContent = 'Copied ✓'; setTimeout(() => b.textContent = 'Copy prompt', 2000); } };
    t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value).then(done, () => { document.execCommand('copy'); done(); }) : (document.execCommand('copy'), done())); },
  bdApplyTags() { const t = ($('bdTagPaste') || {}).value || ''; if (!t.trim()) { S.tagMsg = 'Paste ChatGPT’s reply in the box first.'; S.tagWarn = true; return render(); } applyTags(t); },
  bdFile(i) { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => ingest(String(r.result)); r.readAsText(f); },
  bdPasteGo() { const t = ($('bdPaste') || {}).value || ''; t.trim() ? ingest(t) : (S.err = 'Nothing pasted yet.', render()); },
  bdSample: makeSample,
  bdDiff(d) { S.diff = d; save(); render(); },
  bdTag(id, v) { id = decodeURIComponent(id); v ? S.tags[id] = v : delete S.tags[id]; save(); const p = $('bdPill'); if (p) p.textContent = `${S.qs.filter(q => S.tags[q.id]).length}/${S.qs.length} tagged`; renderAnalysis(); },
  bdBulk(k) { const v = $('bc_' + k).value; if (!v) return; const L = S.qs.filter(q => q.sub === k), a = +$('bf_' + k).value || 1, z = +$('bt_' + k).value || L.length;
    L.forEach((q, i) => { if (i + 1 >= a && i + 1 <= z) S.tags[q.id] = v; }); save(); render(); },
  bdReset() { if (confirm('Clear the loaded paper and its tags from this device?')) { S = { qs: [], tags: {}, topics: {}, diff: S.diff, sample: false, info: '', err: '', tagMsg: '', tagWarn: false }; save(); render(); } },
  __bd: { ingest, agg, toQs, find, csv, pct, REF, applyTags, buildPrompt, matchCh, pInfo, S: () => S }
});
})();
