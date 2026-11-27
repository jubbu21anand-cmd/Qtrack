/* ════════════════════════════════════════════════════════════
   DEADLINE COUNTDOWN (shared by everyone in the session)
   state.deadline = { name, ts (exam time), start (when it was set) }
════════════════════════════════════════════════════════════ */
let dlMode = 'days', dlTimer = null;   // 'days' | 'dhms' | 'hms'  (remembered on this device only)
try { dlMode = localStorage.getItem('qttrack_dl_mode') || 'days'; } catch (e) {}
const DL_MODES = { days: 'Days', dhms: 'DD:HH:MM:SS', hms: 'HH:MM:SS' };

function renderDeadline() {
  const box = document.getElementById('deadlineBox'), btn = document.getElementById('deadlineBtn');
  const d = state.deadline;
  if (btn) btn.textContent = d && d.ts ? 'Edit deadline' : 'Set deadline';
  if (!box) return;
  if (!d || !d.ts) { box.style.display = 'none'; box.innerHTML = ''; clearInterval(dlTimer); dlTimer = null; return; }
  box.style.display = 'block';
  box.innerHTML = `<div class="dl-box">
      <div class="dl-top"><div class="dl-left" id="dlLeft"></div><div class="dl-name">${escHtml(d.name || 'Exam')}</div></div>
      <div class="dl-barrow"><div class="dl-bar"><div class="dl-fill" id="dlFill"></div></div><div class="dl-pct" id="dlPct"></div></div>
    </div>
    <button class="dl-toggle" onclick="cycleDlMode()">Show as: ${DL_MODES[dlMode]}</button>`;
  if (!dlTimer) dlTimer = setInterval(dlTick, 1000);
  dlTick();
}

function dlTick() {
  const d = state.deadline, L = document.getElementById('dlLeft');
  if (!d || !d.ts || !L) return;
  const now = Date.now(), left = Math.max(0, d.ts - now);
  const dd = Math.floor(left / 864e5), hh = Math.floor(left % 864e5 / 36e5), mm = Math.floor(left % 36e5 / 6e4), ss = Math.floor(left % 6e4 / 1e3);
  const totH = Math.floor(left / 36e5);
  L.textContent = left <= 0 ? "Time's up" :
    dlMode === 'dhms' ? [dd, hh, mm, ss].map(pad).join(':') :
    dlMode === 'hms' ? [totH, mm, ss].map(pad).join(':') :
    dd + (dd === 1 ? ' day left' : ' days left');
  const span = Math.max(1, d.ts - (d.start || now));
  const p = Math.min(100, Math.max(0, (now - (d.start || now)) / span * 100));
  document.getElementById('dlFill').style.width = p + '%';
  document.getElementById('dlPct').textContent = p.toFixed(1) + '%';
}

function cycleDlMode() {
  dlMode = dlMode === 'days' ? 'dhms' : dlMode === 'dhms' ? 'hms' : 'days';
  try { localStorage.setItem('qttrack_dl_mode', dlMode); } catch (e) {}
  renderDeadline();
}

function openDeadlineModal() {
  const d = state.deadline;
  document.getElementById('dlName').value = d ? d.name || '' : '';
  let v = '';
  if (d && d.ts) { const x = new Date(d.ts); v = x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()) + 'T' + pad(x.getHours()) + ':' + pad(x.getMinutes()); }
  document.getElementById('dlDate').value = v;
  document.getElementById('dlRemoveBtn').style.display = d && d.ts ? '' : 'none';
  openModal('deadlineModal');
}

function saveDeadline() {
  const name = document.getElementById('dlName').value.trim() || 'Exam';
  const val = document.getElementById('dlDate').value;
  const ts = val ? new Date(val).getTime() : NaN;
  if (isNaN(ts)) { showToast('Pick the exam date'); return; }
  const old = state.deadline;
  if (!old && ts <= Date.now()) { showToast('Pick a future date'); return; }
  const start = old && old.start && old.start < ts ? old.start : Date.now();
  closeModal('deadlineModal');
  doWrite(() => fbPut('/deadline', { name, ts, start })).then(ok => { if (ok) showToast('Deadline saved'); });
}

function removeDeadline() {
  closeModal('deadlineModal');
  doWrite(() => fbDelete('/deadline')).then(ok => { if (ok) showToast('Deadline removed'); });
}
