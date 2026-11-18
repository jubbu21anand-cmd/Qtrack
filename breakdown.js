/* ═══ Paper In-Depth Breakdown — rule-based analysis, no AI/API needed. Data stays on this device. ═══ */
(function () {
const LS = 'qt_bd_v1', SUBS = ['Physics', 'Chemistry', 'Mathematics'];
const $ = id => document.getElementById(id);
const E = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const blank = d => ({ qs: [], tags: {}, topics: {}, diff: d || 'moderate', sample: false, info: '', err: '', tagMsg: '', tagWarn: false, keyMsg: '', keyWarn: false, savedId: null, savedUid: null });
let S = blank(), SAVED = null, charts = [], POS = 4, TA = 60, armed = false, SV = {};
try { const j = JSON.parse(localStorage.getItem(LS) || 'null'); if (j && j.qs && j.qs.length && !j.sample) SAVED = j; } catch (e) {}
const save = () => { try { if (S.qs.length && !S.sample) localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} };   // the demo is never stored

/* ── tolerant reader: pdf2cbt export (JSON) or pasted CSV ── */
const nk = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const K = { id: ['questionid', 'qid', 'qno', 'questionno', 'questionnumber', 'id', 'no'], sec: ['section', 'sectionname', 'subject'],
  st: ['qstatus', 'status', 'questionstatus'], ya: ['youranswer', 'useranswer', 'selected', 'response', 'given', 'chosen', 'markedanswer', 'answergiven'],
  ca: ['correctanswer', 'answerkey', 'key'], res: ['result', 'outcome', 'verdict'], mk: ['marks', 'marksobtained', 'marksawarded', 'score'],
  mx: ['maxmarks', 'totalmarks', 'outof', 'fullmarks'], tm: ['timespent', 'timetaken', 'timeinseconds', 'seconds', 'time'] };
const pick = (o, ns) => { const m = {}; for (const k in o) m[nk(k)] = o[k]; for (const n of ns) if (m[n] !== undefined && m[n] !== null && m[n] !== '') return m[n]; };
const pickAny = (o, ns) => { const m = {}; for (const k in o) m[nk(k)] = o[k]; for (const n of ns) if (n in m) return m[n] == null ? '' : m[n]; };   // like pick(), but keeps an EMPTY value (= skipped)
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
      mk: isNaN(m) ? 0 : m, mx, t: secs(pick(o, K.tm)), ya: pickAny(o, K.ya) };
  });
}
function ingest(text) {
  let arr; try { arr = find(JSON.parse(text)); } catch (e) { arr = csv(text); }
  const qs = arr && arr.length >= 3 ? toQs(arr) : [];
  if (!qs.length) { S.err = 'Could not find question rows. Paste the first ~30 lines of the file to Claude so the reader can be adjusted.'; return render(); }
  const hit = Object.keys(K).filter(k => pick(arr[0], K[k]) !== undefined);
  Object.assign(S, { qs, tags: {}, topics: {}, tagMsg: '', keyMsg: '', savedId: null, savedUid: null, sample: false, err: '', info: `Loaded ${qs.length} questions · fields recognised: ${hit.join(', ')}` });
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
  Object.assign(S, { qs, savedId: null, keyMsg: '', sample: true, err: '', info: 'SAMPLE data — generated for preview, not a real paper.' }); save(); render();
}

/* ── analysis ── */
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
/* ── percentile model: marks ÷ the shift's 99th-percentile marks → percentile curve, evaluated over every past shift (2023–2026) ── */
const PM = (() => { const o = BD_PCT.obs, n = {}; o.forEach(x => n[x.y] = (n[x.y] || 0) + 1); const ms = o.map(x => x.m).sort((a, b) => a - b), t1 = ms[Math.floor(ms.length / 3)], t2 = ms[Math.floor(ms.length * 2 / 3)];
  return o.map(x => ({ y: x.y, m: x.m, w: 1 / n[x.y], d: x.m < t1 ? 'tough' : x.m >= t2 ? 'easy' : 'moderate' })); })();
function Fx(x) { const F = BD_PCT.F; if (x < F[0][0]) return 89; if (x >= F[F.length - 1][0]) return 99.95;
  for (let i = 0; i < F.length - 1; i++) if (x < F[i + 1][0]) return F[i][1] + (F[i + 1][1] - F[i][1]) * (x - F[i][0]) / (F[i + 1][0] - F[i][0]); }
function wq(a, q) { const L = a.slice().sort((x, y) => x.p - y.p), W = L.reduce((t, x) => t + x.w, 0); let c = 0; for (const x of L) { c += x.w; if (c >= q * W - 1e-9) return x.p; } return L[L.length - 1].p; }
const sm = a => ({ med: wq(a, .5), lo: wq(a, .25), hi: wq(a, .75), n: a.length, yrs: [...new Set(a.map(x => x.y))].sort() });
function pInfo(g, mx, diff) {
  const m = mx ? g / mx * 300 : 0, all = PM.map(o => ({ p: Fx(m / o.m), w: o.w, d: o.d, y: o.y })), est = sm(all), pre = sm(all.filter(x => x.d === (diff || S.diff)));
  est.low = est.med < 90; pre.low = pre.med < 90; return { m, est, pre, by: d => sm(all.filter(x => x.d === d)) };
}
const f1 = v => v < 90 ? 'below 90' : v >= 99.9 ? '99.9+' : v.toFixed(1), yr = a => a.yrs[0] === a.yrs[a.yrs.length - 1] ? a.yrs[0] : a.yrs[0] + '–' + a.yrs[a.yrs.length - 1];
const BELOW = `<b>Below 90 isn’t final.</b> Your marks fall under the 90th-percentile mark in our reference data, so we won’t guess a number — and that’s okay. One paper is a snapshot, not a verdict. Revise the weak chapters listed below, redo the questions you got wrong, and come back stronger. Most gains at this stage come from fixing a few chapters and cutting silly mistakes.`;
function predCard(T) {
  const p = pInfo(T.got, T.max), a = p.pre, d3 = ['easy', 'moderate', 'tough'].map(d => `${d}: ${f1(p.by(d).med)}`).join(' · ');
  return `<div class="bd-card"><div class="bd-h">Predictive percentile ${hq('pred')}<span class="bd-pill">${S.diff} paper</span></div>${hp('pred')}
  ${a.low ? `<div class="bd-msg">${BELOW}</div>` : `<div class="bd-big">≈ ${f1(a.med)}</div><div class="bd-sub2">if this was a ${S.diff} paper · middle half of past ${S.diff} shifts: ${f1(a.lo)} – ${f1(a.hi)}</div><div class="bd-sub2">same marks on another paper → ${d3}</div>`}
  <div class="bd-note">${PM.length} past shift readings, ${yr(sm(PM.map(o => ({ p: 0, w: 1, y: o.y }))))} (coaching-institute estimates; NTA publishes no official table).${Math.abs(T.max - 300) > 1 ? ` Marks scaled from ${T.max} to 300.` : ''} A mock has no real percentile — read this as “JEE-equivalent”.</div></div>`;
}
function rangeCard(T) {
  const e = pInfo(T.got, T.max).est;
  return `<div class="bd-card"><div class="bd-h">Estimated percentile ${hq('range')}<span class="bd-pill">same for any difficulty</span></div>${hp('range')}
  ${e.low ? `<div class="bd-msg">${BELOW}</div>` : `<div class="bd-big">${f1(e.lo)} – ${f1(e.hi)}</div><div class="bd-sub2">best single guess ≈ ${f1(e.med)} · the middle half of all ${e.n} past shifts, whatever their difficulty</div>`}
  <div class="bd-note">This band does not move when you change the difficulty rating — it simply says how your marks would have ranked across every shift since ${e.yrs[0]}.</div></div>`;
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
  load: `<b>How to bring your paper in</b><ol><li>Open pdf2cbt and go to <b>Test Results → My Tests</b> (left menu).</li><li>Tap your test, then tap <b>Export</b>. A small <code>.json</code> file downloads.</li><li>Come back here and tap <b>Upload pdf2cbt export</b>, then pick that file. <i>Or</i> open the file, select everything, copy it, paste it in the box and tap <b>Analyse pasted data</b>.</li></ol>No pdf2cbt? Paste one line per question: <code>1, Physics, C, 85</code> = question, subject, result (C right / W wrong / U skipped), seconds spent.<br>If it says it can’t read your file, send its first 30 lines to the developer.<br><br><b>Paper difficulty:</b> rate how hard the paper felt compared with a real JEE Main. It changes the <i>Predictive</i> percentile (not the <i>Estimated</i> band).<br><br><b>Tip:</b> the demo is never saved. Close it any time with <b>Close demo</b>.`,
  tag: `<b>Let ChatGPT sort the questions for you (no manual tagging)</b><ol><li>Tap <b>Copy prompt</b> (the glowing button).</li><li>Open ChatGPT, attach your question paper (PDF or screenshots) and paste the prompt. Send.</li><li>ChatGPT replies with one line per question, like <code>Physics | Kinematics | Projectile motion</code>.</li><li>Copy its reply, paste it in the box here and tap <b>Apply chapters</b>.</li></ol>Extra words from ChatGPT are fine — lines in the wrong format are ignored. If the line counts don’t match, tell ChatGPT: “give exactly one line per question”. If it struggles with the whole paper, do one subject at a time and paste the replies together.`,
  key: `<b>Only needed if your export has no correct answers.</b> pdf2cbt marks a test only when you give it an answer key, and its key tool is built for typing answers in by hand — so instead Qtrack takes the key itself.<ol><li>Tap <b>Copy answer-key prompt</b>.</li><li>Give ChatGPT the prompt plus your answer-key PDF (or the solved paper).</li><li>Paste its reply below and tap <b>Apply answer key</b>. Qtrack compares it with the options you chose and re-marks the paper (+4 right, −1 wrong for options; no penalty for numericals).</li></ol>This works only if your export contains the answers <i>you selected</i> (check after applying — it will tell you).`,
  pred: `One best-guess percentile for your marks, assuming the difficulty you picked. It looks at how your marks would have ranked in past shifts of that difficulty (2023–2026) and shows the middle half of them. Below it you can see what the same marks would give on easy, moderate and tough papers.`,
  range: `The same estimate with the difficulty switch ignored: how your marks would have ranked across <b>every</b> past shift. It never changes when you change the difficulty rating — treat it as the steady, realistic range.`,
  subj: `Blue = marks you scored in each subject. Red = marks lost (full marks minus what you scored, so wrong answers and skipped questions both count).`,
  time: `<b>Line graph:</b> minutes spent on each question, one coloured line per subject. A <b>big red dot</b> = you spent far longer than usual and got it wrong; <b>big yellow</b> = long time, then skipped. Those are the likely moments of confusion. <b>Bars:</b> total minutes per subject on questions you got right, wrong or skipped. <b>Ring:</b> your whole time split by outcome. “Long” means more than 1.6× that subject’s average (and well above the paper average).`,
  chap: `Every chapter you tagged. <b>Accuracy</b> = right ÷ attempted. <b>Strong</b> ≥75%, <b>Watch</b> 50–75%, <b>Weak</b> &lt;50% (needs at least 2 attempted questions). <b>Marks lost</b> = full marks minus scored.`,
  intro: `<b>How the advice is decided</b> (fixed rules, not AI):<ul><li><b>Verdict</b> from accuracy: Strong ≥75%, Watch 50–75%, Weak &lt;50%; “too few” if fewer than 2 attempted.</li><li><b>Next step</b> follows the verdict: Weak → relearn theory + 20+ PYQs; Watch → mixed practice and silly-error hunt; Strong → timed practice; too few → need more questions.</li><li><b>Mistake type</b>: <i>Fast ✗</i> = wrong in under 60% of your average time (rushed/silly); <i>Slow ✗</i> = wrong after more than 1.5× average (stuck). Mostly one kind → “Mostly rushed / stuck”.</li><li><b>Quick summary</b> ranks chapters by marks lost × how often the chapter is asked in Mains × how scoring it is, using the built-in chapter notes (starter data from public weightage analyses — editable).</li></ul>`,
  save: `<b>Save this paper into Exam Analytics</b> so it appears with your other tests. Everything is pre-filled from the breakdown (marks, subject scores, difficulty, topic analysis, a short review per subject). Only the <b>name</b> is required — percentile, rank and total candidates are optional. The percentile prefilled is the Predictive one for the difficulty you choose here; edit it if you know your real result.`
};
const hq = id => `<button class="bd-qm" onclick="bdHelp('${id}',event)" aria-label="Help">?</button>`, hp = id => `<div class="bd-help" id="bdh_${id}" style="display:none">${HELP[id]}</div>`;

/* ── ChatGPT in/out: chapter tags and answer key ── */
const counts = () => { const c = {}; S.qs.forEach(q => c[q.sub] = (c[q.sub] || 0) + 1); return Object.entries(c).map(([k, n]) => `- ${k === 'Other' ? 'Total' : k}: ${n} questions`).join('\n'); };
function buildPrompt() {
  return `You are a JEE expert. I am attaching a question paper. For EVERY question, tell me its subject, chapter and topic.

Questions in this paper:
${counts()}

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
function buildKeyPrompt() {
  return `You are a JEE expert. I am attaching the ANSWER KEY (or the solved paper) of a JEE paper. Give me the correct answer for EVERY question.

Questions in this paper:
${counts()}

Rules:
1. Output exactly ONE line per question, subject by subject, in question order.
2. Line format (use the | symbol): Subject | Answer
3. Subject must be Physics, Chemistry or Mathematics.
4. Multiple-choice: give the option letter A, B, C or D (if the key shows 1,2,3,4 convert to A,B,C,D). Several correct options: A,C
5. Numerical-value questions: give only the number (e.g. 12 or 3.5).
6. If a question was dropped or all options are accepted, write: DROPPED
7. No numbering, no headings, no explanations — only the lines. Give the final answer as plain text.`;
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
function lines(text, minCols) {   // reply lines → arrays of cells, tolerant of numbering/markdown/table pipes
  const out = []; text.split(/\r?\n/).forEach(l => { l = l.replace(/[*`]/g, '').replace(/^\s*(\d+\s*[.):]\s*|[-•>]\s*)/, '').trim(); if (!l.includes('|')) return;
    const p = l.replace(/^\||\|$/g, '').split('|').map(x => x.trim()); if (p.length >= minCols && subOf(p[0])) out.push(p); }); return out;
}
function assign(rows, put) {   // i-th line of a subject ↔ i-th question of that subject (or overall order when subjects are unknown)
  const other = S.qs.some(q => q.sub === 'Other'), by = {}, idx = {}; rows.forEach(r => (by[subOf(r[0])] = by[subOf(r[0])] || []).push(r));
  S.qs.forEach((q, i) => { let r; if (other) { r = rows[i]; if (r) q.sub = subOf(r[0]); } else { const k = idx[q.sub] = idx[q.sub] || 0; idx[q.sub]++; r = (by[q.sub] || [])[k]; } if (r) put(q, r); });
  const cnt = {}; S.qs.forEach(q => cnt[q.sub] = (cnt[q.sub] || 0) + 1);
  return Object.keys(cnt).filter(k => (by[k] || []).length !== cnt[k]).map(k => `${k}: paper has ${cnt[k]}, reply had ${(by[k] || []).length}`);
}
function applyTags(text) {
  const rows = lines(text, 2); if (!rows.length) { S.tagMsg = 'No usable lines found. Each line must look like: Physics | Kinematics | Projectile motion'; S.tagWarn = true; return render(); }
  const bad = new Set(); let ok = 0;
  const off = assign(rows, (q, r) => { const c = matchCh(subOf(r[0]), r[1] || ''); if (c) { S.tags[q.id] = c; S.topics[q.id] = r[2] || ''; ok++; } else bad.add(r[1] || '?'); });
  S.tagMsg = `Tagged ${ok} of ${S.qs.length} questions.` + (off.length ? ` ⚠ Line counts differ — ${off.join('; ')}. Ask ChatGPT for exactly one line per question.` : '') + (bad.size ? ` Unrecognised chapter names: ${[...bad].slice(0, 6).join(', ')} — fix these under “Fix or tag manually”.` : '');
  S.tagWarn = !!(off.length || bad.size); save(); render();
}
const optn = x => /^[1-4]$/.test(x) ? 'ABCD'[+x - 1] : x, norm = x => optn(String(x ?? '').toUpperCase().replace(/\s|OPTION|\(|\)/g, ''));
function judge(ya, key) {
  const a = norm(ya), k = norm(key); if (!a) return 'U';
  const na = parseFloat(a), nkv = parseFloat(k); if (!/[A-D]/.test(a + k) && !isNaN(na) && !isNaN(nkv)) return Math.abs(na - nkv) <= .01 * Math.max(1, Math.abs(nkv)) ? 'C' : 'W';
  return a.split(',').sort().join() === k.split(',').sort().join() ? 'C' : 'W';
}
function applyKey(text) {
  const rows = lines(text, 2); if (!rows.length) { S.keyMsg = 'No usable lines found. Each line must look like: Physics | B'; S.keyWarn = true; return render(); }
  let n = 0, noAns = 0, r = { C: 0, W: 0, U: 0, D: 0 };
  const off = assign(rows, (q, row) => { const key = row[1] || ''; if (q.ya === undefined || q.ya === null) { noAns++; return; }
    if (/drop/i.test(key)) { q.c = 'D'; q.mk = 4; r.D++; n++; return; }
    const c = judge(q.ya, key), mcq = /^[A-D,]+$/.test(norm(key)); q.c = c; q.mk = c === 'C' ? 4 : c === 'W' ? (mcq ? -1 : 0) : 0; r[c]++; n++; });
  S.keyMsg = noAns === S.qs.length ? 'Your export doesn’t seem to include the answers you selected, so Qtrack can’t mark it. Export again from pdf2cbt after finishing the test, or paste CSV with results.' :
    `Marked ${n} questions: ${r.C} right, ${r.W} wrong, ${r.U} skipped${r.D ? `, ${r.D} dropped` : ''}.` + (noAns ? ` ${noAns} had no recorded answer.` : '') + (off.length ? ` ⚠ Line counts differ — ${off.join('; ')}.` : '');
  S.keyWarn = !!(noAns || off.length); save(); render();
}

/* ── chapter intelligence → quick summary ── */
const UNIT = { 'Units & Measurements': 'Mechanics', 'Kinematics': 'Mechanics', 'Laws of Motion': 'Mechanics', 'Work, Energy & Power': 'Mechanics', 'Rotational Motion': 'Mechanics', 'Gravitation': 'Mechanics', 'Properties of Solids & Liquids': 'Mechanics',
  'Thermodynamics & KTG': 'Thermodynamics and Thermal Physics', 'Oscillations & Waves': 'Oscillations & Waves', 'Electrostatics': 'Electrostatics and current dynamics', 'Current Electricity': 'Electrostatics and current dynamics', 'Magnetism & Moving Charges': 'Magnetism',
  'EMI & AC': 'Electromagnetism', 'Electromagnetic Waves': 'EM Waves and Alternating Current', 'Ray Optics': 'Optics', 'Wave Optics': 'Optics', 'Dual Nature of Matter': 'Modern Physics', 'Atoms & Nuclei': 'Modern Physics', 'Semiconductors & Communication': 'Modern Physics', 'Experimental Physics': 'Experimental Physics',
  'Mole Concept': 'Physical Chemistry', 'Atomic Structure': 'Physical Chemistry', 'States of Matter': 'Physical Chemistry', 'Thermodynamics & Thermochemistry': 'Physical Chemistry', 'Chemical Equilibrium': 'Physical Chemistry', 'Ionic Equilibrium': 'Physical Chemistry', 'Redox Reactions': 'Physical Chemistry', 'Solutions': 'Physical Chemistry', 'Electrochemistry': 'Physical Chemistry', 'Chemical Kinetics': 'Physical Chemistry', 'Solid State & Surface Chemistry': 'Physical Chemistry',
  'Periodic Table & Periodicity': 'Inorganic Chemistry', 'Chemical Bonding': 'Inorganic Chemistry', 's & p Block Elements': 'Inorganic Chemistry', 'd & f Block Elements': 'Inorganic Chemistry', 'Coordination Compounds': 'Inorganic Chemistry', 'Metallurgy, Hydrogen & Environment': 'Inorganic Chemistry', 'Salt Analysis & Practical': 'Inorganic Chemistry',
  'GOC & Isomerism': 'Organic Chemistry', 'IUPAC Nomenclature': 'Organic Chemistry', 'Hydrocarbons': 'Organic Chemistry', 'Haloalkanes & Haloarenes': 'Organic Chemistry', 'Alcohols, Phenols & Ethers': 'Organic Chemistry', 'Aldehydes, Ketones & Acids': 'Organic Chemistry', 'Amines & Nitrogen Compounds': 'Organic Chemistry', 'Biomolecules & Polymers': 'Organic Chemistry',
  'Sets, Relations & Functions': 'Sets, Relations & Functions', 'Complex Numbers': 'Algebra', 'Quadratic Equations': 'Algebra', 'Sequences & Series': 'Algebra', 'Permutations & Combinations': 'Algebra', 'Binomial Theorem': 'Algebra', 'Matrices & Determinants': 'Algebra', 'Probability': 'Algebra', 'Statistics': 'Algebra',
  'Trigonometry': 'Trigonometry', 'Straight Lines': 'Conic section and coordinate geometry', 'Circles': 'Conic section and coordinate geometry', 'Conic Sections': 'Conic section and coordinate geometry', 'Limits': 'Calculus', 'Continuity & Differentiability': 'Calculus', 'Application of Derivatives': 'Calculus', 'Integration': 'Calculus', 'Differential Equations': 'Calculus', 'Vectors': 'Vector & 3D Geometry', '3D Geometry': 'Vector & 3D Geometry' };
function summary(chap, tagged) {
  if (!tagged) return ['Tag your chapters (step 2) to get chapter-specific advice here.'];
  const FW = { H: 3, M: 2, L: 1 }, EW = { S: 1.5, M: 1, T: .7 }, FQ = { H: 'A high-frequency chapter in Mains.', M: 'Asked fairly regularly.', L: 'Asked less often.' }, ES = { S: 'Usually scoring.', M: '', T: 'Time-hungry — attempt it after the easy ones.' }, L = [];
  const I = c => BD_INTEL[nm(c)] || ['M', 'M', ''];
  chap.filter(a => a.lost > 0).map(a => ({ a, I: I(a.k), pr: a.lost * FW[I(a.k)[0]] * EW[I(a.k)[1]] })).sort((x, y) => y.pr - x.pr).slice(0, 5).forEach(r =>
    L.push(`<b>${E(nm(r.a.k))}</b> <span class="bd-sm">(${r.a.k.split('|')[0]})</span> — lost ${r.a.lost} marks${r.a.acc != null ? ` at ${Math.round(r.a.acc)}% accuracy` : ' (skipped)'}. ${FQ[r.I[0]]} ${ES[r.I[1]]} ${E(r.I[2])}`));
  const sk = chap.filter(a => a.att === 0 && a.n > 0 && I(a.k)[1] === 'S').slice(0, 3).map(a => nm(a.k)); if (sk.length) L.push(`<b>Scoring chapters you skipped entirely:</b> ${sk.map(E).join(', ')} — these are usually quick marks; try their PYQs next.`);
  const st = chap.filter(a => status(a) === 'strong' && I(a.k)[0] === 'H').slice(0, 3).map(a => nm(a.k)); if (st.length) L.push(`<b>Bank your strengths:</b> ${st.map(E).join(', ')} are strong and frequently asked — keep them warm with short timed sets.`);
  L.push('<b>General:</b> one coaching analysis of five years of Mains found only about a third of Chemistry questions were unique — previous-year questions are the highest-return practice there.');
  return L;
}

/* ── cards ── */
const COL = { Physics: '#3b82f6', Chemistry: '#f59e0b', Mathematics: '#22c55e', Other: '#a78bfa' }, TC = {};
function subjCard(sub) {
  return `<div class="bd-card"><div class="bd-h">Subject performance ${hq('subj')}</div>${hp('subj')}<div class="bd-tw"><table class="bd-t"><tr><th>Subject</th><th>Score</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th></tr>${sub.map(a => `<tr><td>${a.k}</td><td>${a.got}/${a.max}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td></tr>`).join('')}</table></div>
  <div class="bd-chart"><canvas id="bdSubChart"></canvas></div></div>`;
}
function timeCard() {
  const qs = S.qs, subs = SUBS.concat('Other').filter(k => qs.some(q => q.sub === k)), mean = {}, lab = {}, cn = {};
  qs.forEach(q => { cn[q.sub] = (cn[q.sub] || 0) + 1; lab[q.id] = q.sub[0] + cn[q.sub]; });
  subs.forEach(k => { const t = qs.filter(q => q.sub === k && !isNaN(q.t)).map(q => q.t); mean[k] = t.length ? t.reduce((a, b) => a + b) / t.length : 0; });
  if (!qs.some(q => !isNaN(q.t))) return `<div class="bd-card"><div class="bd-h">Time analysis ${hq('time')}</div>${hp('time')}<div class="bd-note">No time-per-question data in this paper.</div></div>`;
  const sp = q => !isNaN(q.t) && q.t > mean[q.sub] * 1.6 && q.t > TA * 1.3, mx = Math.max(...subs.map(k => qs.filter(q => q.sub === k).length)), mins = t => +(t / 60).toFixed(2);
  TC.line = { labels: Array.from({ length: mx }, (_, i) => i + 1), datasets: subs.map(k => { const L = qs.filter(q => q.sub === k); return { label: k, data: L.map(q => isNaN(q.t) ? null : mins(q.t)), borderColor: COL[k], backgroundColor: COL[k], tension: .3, borderWidth: 2, spanGaps: true,
    pointRadius: L.map(q => sp(q) ? 7 : 3), pointBackgroundColor: L.map(q => sp(q) && q.c === 'W' ? '#ef4444' : sp(q) && q.c === 'U' ? '#f5c842' : COL[k]) }; }) };
  const sum = (k, f) => +(qs.filter(q => (!k || q.sub === k) && f(q) && !isNaN(q.t)).reduce((a, q) => a + q.t, 0) / 60).toFixed(1), fC = q => q.c === 'C', fW = q => q.c === 'W' || q.c === 'P', fU = q => q.c === 'U';
  TC.bar = { labels: subs, datasets: [['On correct', fC, '#22c55e'], ['On wrong', fW, '#ef4444'], ['On skipped', fU, '#f5c842']].map(([l, f, c]) => ({ label: l, data: subs.map(k => sum(k, f)), backgroundColor: c })) };
  TC.dough = { labels: ['Correct', 'Wrong', 'Skipped'], datasets: [{ data: [sum(null, fC), sum(null, fW), sum(null, fU)], backgroundColor: ['#22c55e', '#ef4444', '#f5c842'], borderWidth: 0 }] };
  const spk = qs.filter(sp).sort((a, b) => b.t - a.t).slice(0, 8), oc = { C: 'solved ✓ (slow)', W: 'wrong ✗ — likely confused', U: 'skipped — likely confused', P: 'partial', D: 'dropped' };
  return `<div class="bd-card"><div class="bd-h">Time analysis ${hq('time')}</div>${hp('time')}
  <div class="bd-chart" style="height:250px"><canvas id="bdTimeLine"></canvas></div><div class="bd-note">Big red dot = long time + wrong · big yellow dot = long time + skipped. X-axis = question number within the section.</div>
  <div class="bd-two2"><div class="bd-chart" style="height:220px"><canvas id="bdTimeBar"></canvas></div><div class="bd-chart" style="height:220px"><canvas id="bdTimeDough"></canvas></div></div>
  <div class="bd-sh">Where you probably got stuck (long-time questions)</div><ul class="bd-ul">${spk.map(q => `<li><b>${lab[q.id]}</b> · ${fT(q.t)} (${(q.t / mean[q.sub]).toFixed(1)}× your ${q.sub} average) · ${oc[q.c]}${S.tags[q.id] ? ' · ' + E(nm(S.tags[q.id])) : ''}</li>`).join('') || '<li>No unusually long questions — your pacing was even.</li>'}</ul></div>`;
}
function chapCard(chap, tagged) {
  const head = `<div class="bd-card"><div class="bd-h">Chapter breakdown ${hq('chap')}</div>${hp('chap')}`;
  if (!tagged) return head + `<div class="bd-note">Tag your chapters in step 2 above to unlock this (0 of ${S.qs.length} tagged).</div></div>`;
  return head + `<div class="bd-tw"><table class="bd-t"><tr><th>Chapter</th><th>Qs</th><th>✓</th><th>✗</th><th>Skip</th><th>Acc.</th><th>Avg time</th><th>Marks lost</th><th>Verdict</th></tr>${chap.map(a => {
    const st = status(a), tp = st === 'weak' ? (BD_DB[a.k.split('|')[0]] || {})[nm(a.k)] : '';
    return `<tr><td>${E(nm(a.k))}<div class="bd-sm">${a.k.split('|')[0]}${tp ? ' · revise: ' + E(tp.split(';').slice(0, 3).join(';')) : ''}</div></td><td>${a.n}</td><td>${a.C}</td><td>${a.W}</td><td>${a.U}</td><td>${a.acc == null ? '–' : Math.round(a.acc) + '%'}</td><td>${fT(a.avgT)}</td><td>${a.lost}</td><td><span class="bd-chip ${st}">${LBL[st]}</span></td></tr>`; }).join('')}</table></div>
  <div class="bd-chart" style="height:${Math.max(180, chap.length * 26 + 40)}px"><canvas id="bdChapChart"></canvas></div>${tagged < S.qs.length ? `<div class="bd-note">${S.qs.length - tagged} untagged questions are left out of this table.</div>` : ''}</div>`;
}
function introCard(sub, chap, T, tagged) {
  const qs = S.qs, lab = {}, cn = {}; qs.forEach(q => { cn[q.sub] = (cn[q.sub] || 0) + 1; lab[q.id] = q.sub[0] + cn[q.sub]; });
  const fast = q => q.c === 'W' && !isNaN(q.t) && q.t < TA * .6, mxo = q => isNaN(q.mx) ? POS : q.mx, chn = q => S.tags[q.id] ? nm(S.tags[q.id]) : '—', oc = { C: '✓', W: '✗', U: 'skipped', P: 'partial', D: 'dropped' };
  const pace = a => a.avgT == null ? '–' : Math.abs(a.avgT / TA - 1) < .15 ? '≈ same' : a.avgT > TA ? `▲ ${Math.round((a.avgT / TA - 1) * 100)}% slower` : `▼ ${Math.round((1 - a.avgT / TA) * 100)}% faster`;
  const act = { weak: 'Relearn theory, then 20+ PYQs', watch: 'Mixed practice; hunt silly errors', strong: 'Timed practice to stay sharp', few: 'Too few questions to judge' };
  const mt = a => !a.W ? '–' : a.fW > a.sW * 1.5 ? 'Mostly rushed' : a.sW > a.fW * 1.5 ? 'Mostly stuck' : a.fW + a.sW ? 'Mixed' : 'Normal pace';
  const tbl = (hd, rows) => `<div class="bd-tw"><table class="bd-t"><tr>${hd.map(x => `<th>${x}</th>`).join('')}</tr>${rows}</table></div>`;
  let h = `<div class="bd-card"><div class="bd-h">Self-introspection ${hq('intro')}<span class="bd-pill">rule-based</span></div>${hp('intro')}
  <div class="bd-sh" style="margin-top:.2rem">Quick summary — what to do next <span class="bd-pill">chapter knowledge base</span></div><ul class="bd-ul">${summary(chap, tagged).map(x => `<li>${x}</li>`).join('')}</ul>
  <div class="bd-sh">Observations from your paper</div><ul class="bd-ul">${insights(sub, chap).map(x => `<li>${x}</li>`).join('') || '<li>Not enough data yet.</li>'}</ul>`;
  const qf = qs.filter(fast), rec = qf.reduce((a, q) => a + Math.max(0, mxo(q) - q.mk), 0);
  if (rec) { const pp = pInfo(T.got + rec, T.max).pre; h += `<div class="bd-msg good">Potential score: if your <b>${qf.length} quick-fix mistakes</b> (wrong, answered fast) had been right, you’d have <b>${T.got + rec}/${T.max}</b>${pp.low ? '' : ' ≈ ' + f1(pp.med) + ' percentile'}.</div>`; }
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
  return h + `<div class="bd-note">Peer comparison (“where others outscore you”) unlocks once the Reddit dataset is loaded; until then everything here compares you against your own paper. Chapter notes are a starter knowledge base from public analyses, not yet learned from Reddit.</div></div>`;
}
function prep() {
  const cm = {}; S.qs.forEach(q => { if (q.c === 'C' && q.mk > 0) cm[q.mk] = (cm[q.mk] || 0) + 1; });
  POS = +Object.keys(cm).sort((a, b) => cm[b] - cm[a])[0] || 4;
  const ts = S.qs.filter(q => !isNaN(q.t)).map(q => q.t); TA = ts.length ? ts.reduce((a, b) => a + b) / ts.length : 60;
}
function analysis() {
  prep(); const qs = S.qs, sub = agg(q => q.sub), chap = agg(q => S.tags[q.id]).sort((a, b) => b.lost - a.lost), T = agg(() => 'all')[0], tagged = qs.filter(q => S.tags[q.id]).length;
  const tile = (l, v, x) => `<div class="bd-tile"><div class="bd-tl">${l}</div><div class="bd-tv">${v}</div><div class="bd-ts">${x}</div></div>`;
  const strip = `<div class="bd-strip">${tile('Score', `${T.got}/${T.max}`, `${Math.round(T.got / T.max * 100)}% of full marks`)}${tile('Accuracy', T.acc == null ? '–' : Math.round(T.acc) + '%', `${T.C} ✓ · ${T.W} ✗ · ${T.U} skipped`)}${tile('Attempted', `${T.att}/${T.n}`, `${Math.round(T.att / T.n * 100)}% attempt rate`)}${tile('Negative marks', '−' + T.neg, 'lost to wrong answers')}${tile('Time', fT(T.tt), `avg ${fT(T.avgT)} / question`)}</div>`;
  return { h: strip + predCard(T) + rangeCard(T) + subjCard(sub) + timeCard() + chapCard(chap, tagged) + introCard(sub, chap, T, tagged), sub, chap };
}
function drawCharts(sub, chap) {
  if (typeof Chart === 'undefined') return; charts.forEach(c => c.destroy()); charts = [];
  const tick = { color: '#7d93b8' }, grid = { color: 'rgba(28,49,88,.7)' }, leg = { labels: { color: '#7d93b8', boxWidth: 10 } }, base = { responsive: true, maintainAspectRatio: false, plugins: { legend: leg } }, xy = (yt) => ({ x: { ticks: tick, grid }, y: { ticks: tick, grid, beginAtZero: true, title: yt ? { display: true, text: yt, color: '#7d93b8' } : undefined } });
  const mk = (id, cfg) => { const el = $(id); if (el) charts.push(new Chart(el, cfg)); };
  mk('bdSubChart', { type: 'bar', data: { labels: sub.map(x => x.k), datasets: [{ label: 'Marks scored', data: sub.map(x => x.got), backgroundColor: '#3b82f6' }, { label: 'Marks lost', data: sub.map(x => x.lost), backgroundColor: '#ef4444' }] }, options: { ...base, scales: xy() } });
  if (TC.line) { mk('bdTimeLine', { type: 'line', data: TC.line, options: { ...base, scales: { x: { ticks: tick, grid, title: { display: true, text: 'Question number in section', color: '#7d93b8' } }, y: { ticks: tick, grid, beginAtZero: true, title: { display: true, text: 'Minutes', color: '#7d93b8' } } } } });
    mk('bdTimeBar', { type: 'bar', data: TC.bar, options: { ...base, scales: xy('Minutes') } }); mk('bdTimeDough', { type: 'doughnut', data: TC.dough, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: leg, title: { display: true, text: 'Where your time went', color: '#7d93b8' } } } }); }
  const cc = chap.filter(x => x.att); if (cc.length) { cc.sort((p, q) => p.acc - q.acc);
    mk('bdChapChart', { type: 'bar', data: { labels: cc.map(x => nm(x.k)), datasets: [{ label: 'Accuracy %', data: cc.map(x => Math.round(x.acc)), backgroundColor: cc.map(x => ({ strong: '#22c55e', watch: '#f5c842', weak: '#ef4444', few: '#475a7d' })[status(x)]) }] }, options: { ...base, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: tick, grid, min: 0, max: 100 }, y: { ticks: tick, grid } } } }); }
}

/* ── UI ── */
const opts = (sb, sel) => '<option value="">— chapter —</option>' + (sb === 'Other' ? SUBS : [sb]).map(x => `<optgroup label="${x}">${Object.keys(BD_DB[x]).map(c => { const v = x + '|' + c; return `<option value="${E(v)}"${sel === v ? ' selected' : ''}>${E(c)}</option>`; }).join('')}</optgroup>`).join('');
function manual() {
  return SUBS.concat('Other').filter(k => S.qs.some(q => q.sub === k)).map(k => { const L = S.qs.filter(q => q.sub === k);
    return `<div class="bd-subh">${k} <span>${L.length} Qs</span></div><div class="bd-bulk">Q <input id="bf_${k}" type="number" min="1" value="1"> to <input id="bt_${k}" type="number" min="1" value="${L.length}"><select id="bc_${k}">${opts(k)}</select><button class="bd-btn" onclick="bdBulk('${k}')">Apply</button></div>
    <div class="bd-qgrid">${L.map((q, i) => `<div class="bd-q"><span class="bd-dot ${q.c}"></span><b>${i + 1}</b><select onchange="bdTag('${encodeURIComponent(q.id)}',this.value)">${opts(k, S.tags[q.id])}</select></div>`).join('')}</div>`; }).join('');
}
const copyBtn = (id, label, fn) => `<button class="bd-copy" id="${id}" onclick="${fn}()"><span class="bd-qpulse">?</span><span class="bd-cl">${label}</span></button>`;
function tagStep() {
  const done = S.qs.filter(q => S.tags[q.id]).length;
  return `<div class="bd-card"><div class="bd-h">2 · Auto-tag chapters with ChatGPT ${hq('tag')}<span class="bd-pill" id="bdPill">${done}/${S.qs.length} tagged</span></div>${hp('tag')}
  <div class="bd-step"><b>A.</b> ${copyBtn('bdCopyBtn', 'Copy prompt', 'bdCopy')}<span class="bd-sm">then give it to ChatGPT with your question paper</span></div>
  <textarea id="bdPrompt" class="bd-off" readonly tabindex="-1" aria-hidden="true">${E(buildPrompt())}</textarea>
  <div class="bd-step"><b>B.</b> Paste ChatGPT’s reply here:</div>
  <textarea id="bdTagPaste" class="bd-ta" placeholder="Physics | Kinematics | Projectile motion&#10;Physics | Laws of Motion | Friction&#10;…"></textarea>
  <div class="bd-row"><button class="bd-btn bd-primary" onclick="bdApplyTags()">Apply chapters</button></div>
  ${S.tagMsg ? `<div class="bd-note ${S.tagWarn ? 'bd-warn' : ''}">${E(S.tagMsg)}</div>` : ''}
  <details class="bd-fix"><summary>Fix or tag manually (optional)</summary>${manual()}</details></div>`;
}
function keyPanel() {
  return `<details class="bd-fix"><summary>My export has no answer key — get one from ChatGPT ${hq('key')}</summary>${hp('key')}
  <div class="bd-step">${copyBtn('bdKeyBtn', 'Copy answer-key prompt', 'bdCopyKey')}<span class="bd-sm">give it to ChatGPT with your answer-key PDF</span></div>
  <textarea id="bdKeyPrompt" class="bd-off" readonly tabindex="-1" aria-hidden="true">${S.qs.length ? E(buildKeyPrompt()) : ''}</textarea>
  <textarea id="bdKeyPaste" class="bd-ta" placeholder="Physics | B&#10;Physics | 12&#10;Chemistry | A,C&#10;…"></textarea>
  <div class="bd-row"><button class="bd-btn" onclick="bdApplyKey()">Apply answer key</button></div>${S.keyMsg ? `<div class="bd-note ${S.keyWarn ? 'bd-warn' : ''}">${E(S.keyMsg)}</div>` : ''}</details>`;
}
function loadCard() {
  const clr = S.sample ? 'Close demo' : armed ? 'Tap again to clear' : 'Clear';
  return `<div class="bd-card"><div class="bd-h">1 · Load your paper ${hq('load')}</div>${hp('load')}
  <div class="bd-row"><label class="bd-btn bd-primary">Upload pdf2cbt export<input type="file" accept=".json,.csv,.txt" hidden onchange="bdFile(this)"></label><button class="bd-btn" onclick="bdSample()">Load sample</button>${S.qs.length ? `<button class="bd-btn ${armed ? 'bd-armed' : ''}" onclick="bdReset()">${clr}</button>` : ''}</div>
  <textarea id="bdPaste" class="bd-ta" placeholder="…or paste the export JSON here, or CSV lines:  question, section, result (C/W/U), seconds"></textarea>
  <div class="bd-row"><button class="bd-btn" onclick="bdPasteGo()">Analyse pasted data</button></div>
  <div class="bd-h" style="margin-top:.9rem">Paper difficulty (your rating)</div>
  <div class="bd-row">${['easy', 'moderate', 'tough'].map(d => `<button class="bd-chipb ${S.diff === d ? 'active' : ''}" onclick="bdDiff('${d}')">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div>
  ${S.err ? `<div class="bd-note bd-err">${E(S.err)}</div>` : ''}${S.info ? `<div class="bd-note ${S.sample ? 'bd-warn' : ''}">${E(S.info)}</div>` : ''}${S.qs.length ? keyPanel() : ''}</div>`;
}
const resumeCard = () => `<div class="bd-card"><div class="bd-h">Continue where you left off?</div><div class="bd-note">A paper with ${SAVED.qs.length} questions (${Object.keys(SAVED.tags || {}).length} tagged) is stored on this device. It only opens if you choose to.</div><div class="bd-row" style="margin-top:.5rem"><button class="bd-btn bd-primary" onclick="bdResume()">Resume</button><button class="bd-btn" onclick="bdDiscard()">Discard</button></div></div>`;
const exTest = () => typeof state !== 'undefined' && S.savedId && state.exams && state.exams.tests[S.savedId];
const savedBanner = () => exTest() ? `<div class="bd-msg good">Saved to Exam Analytics as <b>${E(exTest().name)}</b>. <a href="#" onclick="bdOpenExam();return false">Open it</a> · tap <b>＋ Save</b> again to update it.</div>` : '';
function render() {
  const b = $('bdBody'); if (!b) return;
  const sb = $('bdSaveBtn'); if (sb) { sb.disabled = !S.qs.length || S.sample; sb.title = !S.qs.length ? 'Load a paper first' : S.sample ? 'The demo can’t be saved — load a real paper' : 'Save to Exam Analytics'; }
  b.innerHTML = loadCard() + (S.qs.length ? savedBanner() + tagStep() + '<div id="bdAnalysis"></div>' : (SAVED ? resumeCard() : '') + '<div class="bd-empty"><strong>No paper loaded</strong>Export your result from pdf2cbt (My Tests → Export), upload it above, or load the demo to preview. Tap the ? on any card for help.</div>');
  if (S.qs.length) renderAnalysis();
}
function renderAnalysis() { const el = $('bdAnalysis'); if (!el) return; const r = analysis(); el.innerHTML = r.h; drawCharts(r.sub, r.chap); }

/* ── save to Exam Analytics ── */
const DIFF = { easy: 'easy', moderate: 'mod', tough: 'tough' }, fam = k => ({ Physics: 'physics', Chemistry: 'chemistry', Mathematics: 'maths' })[k] || null;
function tName(k) { if (typeof state !== 'undefined' && state.subjects) { const m = state.subjects.find(x => fam(k) && typeof examSubjFamily === 'function' && examSubjFamily(x.name) === fam(k)); if (m) return m.name; } return k === 'Mathematics' ? 'Maths' : k; }
function saveDraft() {
  prep(); const sub = agg(q => q.sub), T = agg(() => 'all')[0], chap = agg(q => S.tags[q.id]), an = {}, rv = {};
  S.qs.forEach(q => { const t = S.tags[q.id]; if (!t) return; const [sb, c] = t.split('|'), u = UNIT[c], n = tName(sb); if (!u) return; const a = (an[n] = an[n] || {})[u] = an[n][u] || { attempted: 0, scored: 0 }, mx = isNaN(q.mx) ? POS : q.mx;
    if ('CWP'.includes(q.c)) a.attempted += mx; if (q.c === 'C' || q.c === 'P') a.scored += Math.max(0, q.mk); });
  sub.forEach(a => { const cs = chap.filter(x => x.k.startsWith(a.k + '|') && x.att >= 2), w = cs.filter(x => x.acc < 50).map(x => nm(x.k)), g = cs.filter(x => x.acc >= 75).map(x => nm(x.k)), fw = S.qs.filter(q => q.sub === a.k && q.c === 'W' && !isNaN(q.t) && q.t < TA * .6).length;
    rv[tName(a.k)] = `Auto-summary (Paper Breakdown): ${a.got}/${a.max} marks, ${a.acc == null ? 'no attempts' : Math.round(a.acc) + '% accuracy'} on ${a.att} attempted of ${a.n}.` + (w.length ? ` Weak: ${w.join(', ')}.` : '') + (g.length ? ` Strong: ${g.join(', ')}.` : '') + (fw ? ` ${fw} quick wrong answers (likely silly mistakes).` : ''); });
  return { sub, T, an, rv, wk: chap.filter(x => x.att >= 2 && x.acc < 50).slice(0, 3).map(x => nm(x.k)) };
}
const $v = id => ($(id) || {}).value;
function curPct() { const p = pInfo(SV.T.got, SV.T.max, SV.diff).pre; return p.low ? null : Math.round(p.med * 10) / 10; }
function updPct() { SV.cur = curPct(); if (!SV.edited) $('bdsPct').value = SV.cur == null ? '' : SV.cur; const e = pInfo(SV.T.got, SV.T.max, SV.diff).pre;
  $('bdsHint').textContent = SV.cur == null ? 'Below 90 isn’t final — we leave the percentile blank. Enter your real percentile if you know it, or save without one.' : `Estimated for a ${SV.diff} paper: ≈ ${f1(e.med)} (middle half ${f1(e.lo)} – ${f1(e.hi)}). Edit it if you know your real percentile.`; }
function lockState() { const u = $v('bdsUser'), lk = typeof state !== 'undefined' && state.exams && state.exams.locks && state.exams.locks[u]; const need = !!(lk && examAuthedUid !== u); $('bdsPassWrap').style.display = need ? 'block' : 'none'; }
function setDiffBtns() { ['easy', 'moderate', 'tough'].forEach(d => { const b = $('bdsD_' + d); if (b) b.classList.toggle('selected', SV.diff === d); }); }
function setTypeBtns() { ['JM', 'JA', ''].forEach(t => { const b = $('bdsT_' + t); if (b) b.classList.toggle('selected', (SV.jm || '') === t); }); }

Object.assign(window, {
  bdRender: render,
  bdHelp(id, ev) { if (ev) { ev.preventDefault(); ev.stopPropagation(); } const el = $('bdh_' + id); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; },
  bdCopy() { cp('bdPrompt', 'bdCopyBtn', 'Copy prompt'); }, bdCopyKey() { cp('bdKeyPrompt', 'bdKeyBtn', 'Copy answer-key prompt'); },
  bdApplyTags() { const t = $v('bdTagPaste') || ''; if (!t.trim()) { S.tagMsg = 'Paste ChatGPT’s reply in the box first.'; S.tagWarn = true; return render(); } applyTags(t); },
  bdApplyKey() { const t = $v('bdKeyPaste') || ''; if (!t.trim()) { S.keyMsg = 'Paste ChatGPT’s reply in the box first.'; S.keyWarn = true; return render(); } applyKey(t); },
  bdFile(i) { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => ingest(String(r.result)); r.readAsText(f); },
  bdPasteGo() { const t = $v('bdPaste') || ''; t.trim() ? ingest(t) : (S.err = 'Nothing pasted yet.', render()); },
  bdSample: makeSample,
  bdDiff(d) { S.diff = d; save(); render(); },
  bdTag(id, v) { id = decodeURIComponent(id); v ? S.tags[id] = v : delete S.tags[id]; save(); const p = $('bdPill'); if (p) p.textContent = `${S.qs.filter(q => S.tags[q.id]).length}/${S.qs.length} tagged`; renderAnalysis(); },
  bdBulk(k) { const v = $('bc_' + k).value; if (!v) return; const L = S.qs.filter(q => q.sub === k), a = +$('bf_' + k).value || 1, z = +$('bt_' + k).value || L.length; L.forEach((q, i) => { if (i + 1 >= a && i + 1 <= z) S.tags[q.id] = v; }); save(); render(); },
  bdResume() { if (SAVED) { S = Object.assign(blank(), SAVED); SAVED = null; render(); } },
  bdDiscard() { try { localStorage.removeItem(LS); } catch (e) {} SAVED = null; render(); },
  bdReset() {   // no browser confirm() (it can be blocked): first tap arms, second tap clears
    if (S.sample) { S = blank(S.diff); armed = false; return render(); }
    if (!armed) { armed = true; render(); setTimeout(() => { if (armed) { armed = false; render(); } }, 4000); return; }
    armed = false; try { localStorage.removeItem(LS); } catch (e) {} SAVED = null; S = blank(S.diff); render(); },
  bdOpenSave() {
    if (!S.qs.length || S.sample) return typeof showToast === 'function' && showToast(S.sample ? 'The demo can’t be saved — load a real paper' : 'Load a paper first');
    const U = (typeof visibleUserList === 'function' ? visibleUserList : (typeof userList === 'function' ? userList : () => []))();   // respects anonymous mode
    if (!U.length) return showToast('Add a person on the Question Tracker page first');
    const d = saveDraft(), ex = exTest(); SV = { diff: S.diff, edited: false, T: d.T, d, jm: d.T.max === 300 ? 'JM' : '' };
    const uid = ex && U.some(u => u.id === ex.ownerUid) ? ex.ownerUid : (typeof examUid !== 'undefined' && U.some(u => u.id === examUid) ? examUid : U[0].id);
    $('bdsTitle').textContent = ex ? 'Update saved test' : 'Save to Exam Analytics'; $('bdsGo').textContent = ex ? 'Update' : 'Save';
    $('bdsUser').innerHTML = U.map(u => `<option value="${E(u.id)}"${u.id === uid ? ' selected' : ''}>${E(u.name)}</option>`).join('');
    $('bdsName').value = ex ? ex.name : ''; $('bdsDate').value = ex ? ex.date : todayStr(); $('bdsDate').max = todayStr();
    $('bdsTotal').value = d.T.max; $('bdsObt').value = d.T.got; $('bdsRank').value = ex && ex.overallRank != null ? ex.overallRank : ''; $('bdsStud').value = ex && ex.totalStudents != null ? ex.totalStudents : '';
    $('bdsNote').value = ex ? ex.note || '' : `From Paper In-Depth Breakdown.${d.wk.length ? ' Weak: ' + d.wk.join(', ') + '.' : ''}`;
    $('bdsAuto').checked = true; $('bdsAutoTxt').textContent = Object.keys(d.an).length ? 'Also fill the topic-wise analysis and a short review per subject (you can edit them later)' : 'Fill a short review per subject (tag chapters first to also get the topic-wise analysis)';
    $('bdsSubj').innerHTML = d.sub.map(a => `<span>${E(tName(a.k))} <b>${a.got}/${a.max}</b></span>`).join('');
    $('bdsPass').value = ''; if (ex && ex.pctEstimated === false && ex.overallPercentile != null) { SV.edited = true; $('bdsPct').value = ex.overallPercentile; }
    setDiffBtns(); setTypeBtns(); updPct(); lockState(); openModal('bdSaveModal'); },
  bdSaveDiff(d) { SV.diff = d; setDiffBtns(); updPct(); }, bdSaveType(t) { SV.jm = t; setTypeBtns(); }, bdSaveUser: lockState,
  bdSavePct() { SV.edited = true; },
  bdSaveRank() { const c = typeof examCalcPercentile === 'function' ? examCalcPercentile($v('bdsRank'), $v('bdsStud')) : null; if (c != null) { $('bdsPct').value = c; SV.edited = true; } },
  bdSaveGo() {
    const name = ($v('bdsName') || '').trim(); if (!name) return showToast('Enter a test name');
    const uid = $v('bdsUser'), lk = state.exams.locks && state.exams.locks[uid];
    if (lk && examAuthedUid !== uid) { if (!examCanAttempt(uid)) return; const ok = simpleHash(uid + ':' + ($v('bdsPass') || '')) === lk.hash; examRecordAttempt(uid, ok); if (!ok) return showToast('Incorrect password'); }
    const d = SV.d, rank = $v('bdsRank') ? Number($v('bdsRank')) : null, stud = $v('bdsStud') ? Number($v('bdsStud')) : null, calc = examCalcPercentile(rank, stud), typed = parseFloat($v('bdsPct'));
    const pct = !isNaN(typed) ? Math.round(typed * 100) / 100 : calc, est = !isNaN(typed) && SV.cur != null && Math.abs(typed - SV.cur) < .06 && !(calc != null && Math.abs(calc - typed) < .06);
    const prev = exTest(), id = prev ? S.savedId : 'ex' + Date.now(), auto = $('bdsAuto').checked;
    const test = { id, mode: 'jee', name, ownerUid: uid, date: $v('bdsDate') || todayStr(), totalMarks: Number($v('bdsTotal')) || 0, obtainedMarks: Number($v('bdsObt')) || 0, overallRank: rank, totalStudents: stud,
      overallPercentile: pct == null ? null : pct, pctEstimated: !!est, note: ($v('bdsNote') || '').trim(), difficulty: DIFF[SV.diff], jmja: SV.jm || null, source: 'paper-breakdown',
      analysis: auto ? d.an : (prev ? prev.analysis || {} : {}), subjectReviews: auto ? d.rv : (prev ? prev.subjectReviews || {} : {}),
      subjects: d.sub.map(a => ({ name: tName(a.k), score: a.got, max: a.max })) };
    closeModal('bdSaveModal');
    doWrite(() => fbPut('/exams/tests/' + id, test)).then(ok => { if (ok) { S.savedId = id; S.savedUid = uid; save(); render(); showToast(prev ? 'Test updated' : 'Saved to Exam Analytics'); } });
  },
  bdOpenExam() { if (!S.savedId || typeof showPage !== 'function') return; examUid = S.savedUid; examMode = 'jee'; examSelTestId = S.savedId; showPage('examPage', 'examNav'); },
  __bd: { ingest, agg, toQs, find, csv, applyTags, applyKey, buildPrompt, buildKeyPrompt, matchCh, pInfo, judge, saveDraft, UNIT, PM, summary, S: () => S, SAVED: () => SAVED }
});
function cp(ta, btn, label) { const t = $(ta), done = () => { const b = $(btn); if (b) { const l = b.querySelector('.bd-cl'); l.textContent = 'Copied ✓'; b.classList.add('done'); setTimeout(() => { l.textContent = label; b.classList.remove('done'); }, 2000); } };
  const fb = () => { try { t.style.display = 'block'; t.select(); document.execCommand('copy'); t.style.display = ''; } catch (e) {} done(); };
  navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t.value).then(done, fb) : fb(); }
})();
