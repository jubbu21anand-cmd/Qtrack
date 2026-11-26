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
  if (!showFromUrl() && pathSlug()) { try { history.replaceState({}, '', '/' + location.search); } catch (e) {} }   // unknown address → home, tidy URL
  renderDailyQuote();
  loadCustomTint();
  renderCustomiseSwatches();
  await loadRemote(); // then sync from Firebase
  checkJoinLink();
  startPoll();
  checkFirstVisit();
  initDevWarning();
  initExamLockHardening();

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
