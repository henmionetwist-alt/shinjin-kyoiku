/* ===== 社員側 ===== */

let me = null;
let items = [], done = {}, memos = {}, approvals = {}, unlocked = {}, myReports = [];
let practice = {};
let myCal = newCalState();
let practicePass = { typingCpm: 0, typingAcc: 0, shortcutScore: 0 };
let appSettings = { phaseLock: false };
const visibleItems = () => unlockedItems(items, unlocked, appSettings.phaseLock);
let trainingFilter = 'all';
let typeFilter = 'all';
let selectedPhase = null;
const openItems = new Set();

document.addEventListener('DOMContentLoaded', () => {
  applyAppName('');
  bindLoginForm();
  $('#blocked-logout').addEventListener('click', () => auth.signOut());
  $('#btn-logout').addEventListener('click', () => { if (confirm('ログアウトしますか？')) auth.signOut(); });
  $$('.tabbar button').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab !== 'practice') stopPracticeSession(); setTab(b.dataset.tab); }));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.goto)));
  $$('.filter-row .chip').forEach(c => c.addEventListener('click', () => {
    trainingFilter = c.dataset.filter;
    $$('.filter-row .chip').forEach(x => x.classList.toggle('active', x === c));
    renderTraining();
  }));
  $('#training-list').addEventListener('click', onTrainingClick);
  $('#type-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    typeFilter = b.dataset.type;
    renderTraining();
  });
  $('#phase-chips').addEventListener('click', e => {
    const c = e.target.closest('[data-phase]');
    if (!c) return;
    selectedPhase = c.dataset.phase;
    renderTraining();
  });
  $('#home-phases').addEventListener('click', e => {
    const row = e.target.closest('[data-phase]');
    if (!row) return;
    selectedPhase = row.dataset.phase;
    renderTraining();
    setTab('training');
  });
  $('#report-form').addEventListener('submit', submitReport);
  $('#report-cal').addEventListener('click', e => {
    const day = e.target.closest('[data-cal-day]');
    if (day) { myCal.sel = day.dataset.calDay; renderHistory(); return; }
    if (e.target.closest('[data-cal-prev]')) { calNav(myCal, -1); renderHistory(); return; }
    if (e.target.closest('[data-cal-next]')) { calNav(myCal, 1); renderHistory(); return; }
    if (e.target.closest('[data-cal-today]')) { calNav(myCal, 0); renderHistory(); return; }
    const write = e.target.closest('[data-write-day]');
    if (write) { $('#report-date').value = write.dataset.writeDay; $('#report-did').focus(); window.scrollTo(0, 0); }
  });
  const didEl = $('#report-did');
  didEl.addEventListener('focus', () => { if (!didEl.value) didEl.value = '・'; });
  didEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return;
    e.preventDefault();
    const pos = didEl.selectionStart;
    didEl.value = didEl.value.slice(0, pos) + '\n・' + didEl.value.slice(didEl.selectionEnd);
    didEl.selectionStart = didEl.selectionEnd = pos + 2;
  });
  bindRefresh(refreshAll);
  auth.onAuthStateChanged(onAuth);
});

/* 最新の状態に更新（入力中の日報は消さない） */
async function refreshAll(btn) {
  if (!me || (btn && btn.disabled)) return;
  setBusy(btn, true, '更新中…');
  try {
    if (await checkForNewVersion(true)) return;
    await loadAll();
    renderHome(); renderTraining(); renderHistory();
    if (!practiceSession) renderPractice();
    toast('最新の状態に更新しました', 'ok');
  } catch (err) {
    toast(authErrorMessage(err), 'err');
  } finally {
    setBusy(btn, false);
  }
}

async function onAuth(user) {
  if (!user) { me = null; showView('view-login'); return; }
  showView('view-loading');
  try {
    const empSnap = await db.doc('employees/' + user.uid).get();
    if (!empSnap.exists) {
      const adm = await db.doc('admins/' + (user.email || '').toLowerCase()).get().catch(() => null);
      if (adm && adm.exists) {
        showBlocked('このアカウントは責任者用です。責任者画面からログインしてください。', true);
      } else {
        showBlocked('このアカウントは社員として登録されていません。責任者に確認してください。');
      }
      return;
    }
    const data = empSnap.data();
    if (data.active === false) { showBlocked('このアカウントは現在使えません。責任者に確認してください。'); return; }
    me = { uid: user.uid, name: data.name || user.email, email: user.email };
    $('#me-name').textContent = me.name;
    await loadAll();
    renderAll();
    setTab('home');
    showView('view-main');
    checkForNewVersion(false);
  } catch (err) {
    showBlocked('読み込みに失敗しました：' + authErrorMessage(err));
  }
}

function showBlocked(msg, adminLink) {
  $('#blocked-msg').textContent = msg;
  $('#blocked-actions').innerHTML = adminLink ? '<a class="btn btn-primary btn-block" href="admin.html">責任者画面へ</a>' : '';
  showView('view-blocked');
}

async function loadAll() {
  const [it, prog, appr, reps, app, pw] = await Promise.all([
    fetchItems(true),
    db.doc('progress/' + me.uid).get(),
    db.doc('approvals/' + me.uid).get(),
    db.collection('reports').where('uid', '==', me.uid).get(),
    fetchAppSettings(),
    fetchPracticeWords(),
  ]);
  items = it;
  done = prog.exists ? (prog.data().done || {}) : {};
  memos = prog.exists ? (prog.data().memos || {}) : {};
  practice = prog.exists ? (prog.data().practice || {}) : {};
  practiceWords = pw.words;
  practicePass = pw.pass;
  approvals = appr.exists ? (appr.data().items || {}) : {};
  unlocked = appr.exists ? (appr.data().unlocked || {}) : {};
  appSettings = app;
  setReports(reps);
  markLoaded();
}

function setReports(snap) {
  myReports = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function renderAll() {
  renderHome();
  renderTraining();
  renderReportForm();
  renderHistory();
  renderPractice();
}

/* ---- ホーム ---- */
function renderHome() {
  $('#home-greet').textContent = `${me.name} さん`;
  const vis = visibleItems();
  const s = progressSummary(vis, done, approvals);
  const pct = s.total ? Math.round(s.approved / s.total * 100) : 0;
  $('#home-approved').textContent = s.approved;
  $('#home-total').textContent = s.total;
  $('#home-bar').style.width = pct + '%';
  const phases = groupByPhase(items);
  const cur = currentPhase(vis, done, approvals);
  $('#home-phases').innerHTML = phases.map(p => {
    const open = isPhaseUnlocked(p.name, unlocked, appSettings.phaseLock);
    if (!open) {
      return `<div class="phase-row locked" data-phase="${esc(p.name)}">
        <div class="phase-head"><b>🔒 ${esc(p.name)}</b><span class="muted small">責任者の許可待ち（${p.items.length} 項目）</span></div>
      </div>`;
    }
    const ps = progressSummary(p.items, done, approvals);
    return `<div class="phase-row ${p.name === cur ? 'current' : ''}" data-phase="${esc(p.name)}">
      <div class="phase-head"><b>${esc(p.name)}</b><span class="muted small">${ps.approved} / ${ps.total}${ps.pending ? `（確認待ち ${ps.pending}）` : ''}</span></div>
      ${stampGrid(p.items, done, approvals)}
    </div>`;
  }).join('');
  const next = vis.find(i => statusOf(i.id, done, approvals) === 'none');
  let msg;
  if (!items.length) msg = '教育項目はまだ登録されていません';
  else if (!s.total) msg = '責任者が段階を許可すると、ここに項目が表示されます';
  else if (next) msg = `次の項目：${next.title}` + (s.pending ? `（確認待ち ${s.pending} 件）` : '');
  else if (s.pending) msg = `すべて履修済みです。責任者の確認待ちが ${s.pending} 件あります`;
  else msg = 'すべての項目が承認されました';
  $('#home-next').textContent = msg;

  const today = myReports.find(r => r.date === todayStr());
  if (today) {
    const conf = Object.values(today.confirmations || {});
    $('#home-report').innerHTML = `<span class="badge badge-approved">提出済み</span> <span class="muted small">${conf.length ? '確認：' + esc(conf.map(c => c.name).join('、')) : '責任者の確認待ち'}</span>`;
  } else {
    $('#home-report').innerHTML = '<span class="badge badge-none">未提出</span>';
  }
}

/* ---- 教育項目 ---- */
function renderTraining() {
  const wrap = $('#training-list');
  const vis = visibleItems();
  const allPhases = groupByPhase(items);
  const phases = groupByPhase(vis);
  const isOpen = name => isPhaseUnlocked(name, unlocked, appSettings.phaseLock);
  if (selectedPhase !== '*' && !allPhases.some(p => p.name === selectedPhase)) {
    selectedPhase = currentPhase(vis, done, approvals);
    if (!allPhases.some(p => p.name === selectedPhase)) selectedPhase = allPhases.length ? allPhases[0].name : '*';
  }
  $('#phase-chips').innerHTML = allPhases.length > 1
    ? `<button class="chip ${selectedPhase === '*' ? 'active' : ''}" data-phase="*">すべて</button>` +
      allPhases.map(p => `<button class="chip ${p.name === selectedPhase ? 'active' : ''} ${isOpen(p.name) ? '' : 'locked'}" data-phase="${esc(p.name)}">${isOpen(p.name) ? '' : '🔒 '}${esc(p.name)}</button>`).join('')
    : '';
  if (selectedPhase !== '*' && !isOpen(selectedPhase)) {
    renderTypeSeg($('#type-seg'), [], typeFilter);
    wrap.innerHTML = `<p class="empty">🔒 「${esc(selectedPhase)}」はまだ責任者の許可待ちです<br><span class="small">許可されると、ここに項目が表示されます</span></p>`;
    return;
  }
  const phase = phases.find(p => p.name === selectedPhase);
  const base = (selectedPhase !== '*' && phase) ? phase.items : vis;
  renderTypeSeg($('#type-seg'), base, typeFilter);
  const matchType = i => typeFilter === 'all' || (i.type || 'check') === typeFilter;
  const list = base.filter(i => matchType(i)
    && (trainingFilter === 'all' || statusOf(i.id, done, approvals) === trainingFilter));
  if (!list.length) {
    let msg = items.length ? (vis.length ? '該当する項目はありません' : '責任者が段階を許可すると、ここに項目が表示されます') : '教育項目はまだ登録されていません';
    if (vis.length && typeFilter !== 'all' && selectedPhase !== '*') {
      const others = phases.filter(p => p.name !== selectedPhase && p.items.some(matchType));
      if (others.length) {
        msg += `<br><span class="small">${TYPE_LABELS[typeFilter]}は別の段階にあります：` +
          others.map(p => `<button class="chip" data-phase="${esc(p.name)}">${esc(p.name)} ${p.items.filter(matchType).length}</button>`).join(' ') + '</span>';
      }
    }
    wrap.innerHTML = `<p class="empty">${msg}</p>`;
    return;
  }
  const showPhaseTitles = selectedPhase === '*' && allPhases.length > 1;
  wrap.innerHTML = groupByPhase(list).map(p =>
    `${showPhaseTitles ? `<h3 class="phase-title">${esc(p.name)}</h3>` : ''}` +
    p.groups.map(g => `<h3 class="section-title">${esc(g.name)}</h3>${g.items.map(renderItem).join('')}`).join('')
  ).join('');
}

function renderItem(it) {
  const st = statusOf(it.id, done, approvals);
  const isOpen = openItems.has(it.id);
  let actions = '';
  if (st === 'none') {
    actions = `<button class="btn btn-primary" data-done="${it.id}">履修済みにする</button>`;
  } else if (st === 'pending') {
    actions = `<span>${fmtDateTime(done[it.id])} に履修。責任者の確認待ちです</span><button class="btn btn-ghost btn-sm" data-undo="${it.id}">取り消す</button>`;
  } else {
    const a = approvals[it.id];
    actions = `<span>✅ ${esc(a.by || '責任者')} が ${fmtDateTime(a.at)} に承認</span>`;
  }
  const quick = (st === 'none' && it.type === 'check')
    ? `<button class="btn btn-primary btn-sm" data-done="${it.id}">履修</button>`
    : `<span class="chev">›</span>`;
  const memo = memos[it.id];
  const memoHtml = `<div class="memo">
      <label>自分のメモ <span class="muted">（責任者にも見えます）</span>
        <textarea data-memo="${it.id}" rows="2" placeholder="気づき・質問・覚えておきたいこと">${esc(memo ? memo.text : '')}</textarea>
      </label>
      <div class="memo-actions"><span class="muted small">${memo ? fmtDateTime(memo.at) + ' 保存' : ''}</span><button class="btn btn-ghost btn-sm" data-save-memo="${it.id}">メモを保存</button></div>
    </div>`;
  return `<div class="item item-${st} ${isOpen ? 'open' : ''}" data-item="${it.id}">
    <div class="item-head" data-toggle>
      <span class="badge badge-${st}">${STATUS_LABELS[st]}</span>
      <span class="item-title">${esc(it.title)}</span>
      ${memo ? '<span class="memo-mark" title="メモあり">📝</span>' : ''}
      ${quick}
    </div>
    <div class="item-body" ${isOpen ? '' : 'hidden'}>
      ${it.type === 'video' && it.videoUrl ? `<a class="btn btn-video" href="${esc(it.videoUrl)}" target="_blank" rel="noopener">▶ ビデオを見る</a>` : ''}
      ${it.description ? `<p class="item-desc">${nl2br(it.description)}</p>` : ''}
      <div class="item-actions">${actions}</div>
      ${memoHtml}
    </div>
  </div>`;
}

function onTrainingClick(e) {
  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) { markDone(doneBtn.dataset.done, doneBtn); return; }
  const undoBtn = e.target.closest('[data-undo]');
  if (undoBtn) { undoDone(undoBtn.dataset.undo, undoBtn); return; }
  const memoBtn = e.target.closest('[data-save-memo]');
  if (memoBtn) { saveMemo(memoBtn.dataset.saveMemo, memoBtn); return; }
  if (e.target.closest('.memo')) return;
  if (e.target.closest('a')) return;
  const phaseBtn = e.target.closest('[data-phase]');
  if (phaseBtn) { selectedPhase = phaseBtn.dataset.phase; renderTraining(); return; }
  const head = e.target.closest('[data-toggle]');
  if (head) {
    const item = head.closest('.item');
    const id = item.dataset.item;
    const body = $('.item-body', item);
    const nowOpen = body.hidden;
    body.hidden = !nowOpen;
    item.classList.toggle('open', nowOpen);
    if (nowOpen) openItems.add(id); else openItems.delete(id);
  }
}

async function markDone(id, btn) {
  setBusy(btn, true, '…');
  try {
    const now = Date.now();
    await db.doc('progress/' + me.uid).set({ done: { [id]: now } }, { merge: true });
    done[id] = now;
    toast('履修済みにしました。責任者の確認をお待ちください', 'ok');
    renderTraining(); renderHome();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

async function saveMemo(id, btn) {
  const ta = $(`textarea[data-memo="${id}"]`);
  const text = (ta ? ta.value : '').trim();
  setBusy(btn, true, '保存中…');
  try {
    if (text) {
      const entry = { text, at: Date.now() };
      await db.doc('progress/' + me.uid).set({ memos: { [id]: entry } }, { merge: true });
      memos[id] = entry;
      toast('メモを保存しました', 'ok');
    } else if (memos[id]) {
      await db.doc('progress/' + me.uid).update({ ['memos.' + id]: FV.delete() });
      delete memos[id];
      toast('メモを消しました');
    }
    openItems.add(id);
    renderTraining();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

async function undoDone(id, btn) {
  setBusy(btn, true, '…');
  try {
    await db.doc('progress/' + me.uid).update({ ['done.' + id]: FV.delete() });
    delete done[id];
    toast('取り消しました');
    renderTraining(); renderHome();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

/* ---- 日報 ---- */
function renderReportForm() {
  const dateEl = $('#report-date');
  if (!dateEl.value) dateEl.value = todayStr();
}

async function submitReport(e) {
  e.preventDefault();
  const date = $('#report-date').value;
  const clean = v => v.split('\n').map(l => l.trim()).filter(l => l && l !== '・').join('\n');
  const did = clean($('#report-did').value), notice = clean($('#report-notice').value), next = clean($('#report-next').value);
  const text = [did && '【今日やったこと】\n' + did, notice && '【気づき】\n' + notice, next && '【次回の課題】\n' + next].filter(Boolean).join('\n');
  const checks = [];
  if (!date) { toast('日付を入れてください', 'err'); return; }
  if (!did && !notice && !next) { toast('「今日やったこと」などを書いてください', 'err'); return; }
  const existing = myReports.find(r => r.date === date);
  if (existing && !confirm(`${fmtYmd(date)} の日報はすでに提出しています。内容を書き換えますか？`)) return;

  const btn = $('#report-submit');
  setBusy(btn, true, '送信中…');
  try {
    if (existing) {
      await db.doc('reports/' + existing.id).update({ checks, text, did, notice, next, updatedAt: FV.serverTimestamp() });
    } else {
      await db.collection('reports').add({
        uid: me.uid, name: me.name, date, checks, text, did, notice, next,
        confirmations: {}, createdAt: FV.serverTimestamp(),
      });
    }
    toast('日報を提出しました', 'ok');
    ['report-did', 'report-notice', 'report-next'].forEach(id => { $('#' + id).value = ''; });
    $('#report-date').value = todayStr();
    setReports(await db.collection('reports').where('uid', '==', me.uid).get());
    renderHistory(); renderHome();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
  } finally {
    setBusy(btn, false);
  }
}

function myDayMarks() {
  const marks = {};
  const add = (key, f) => { if (!key) return; marks[key] = marks[key] || { a: false, b: false, n: 0 }; f(marks[key]); };
  myReports.forEach(r => add(r.date, m => { m.b = true; }));
  Object.values(done).forEach(ts => add(ymdOf(ts), m => { m.n++; }));
  Object.values(approvals).forEach(x => add(ymdOf(x && x.at), m => { m.n++; }));
  Object.values(memos).forEach(m => add(ymdOf(m && m.at), k => { k.a = true; }));
  return marks;
}
function renderHistory() {
  const wrap = $('#report-cal');
  const dt = myCal.sel;
  const rep = myReports.find(r => r.date === dt);
  const byId = {}; items.forEach(i => { byId[i.id] = i; });
  const acts = [];
  Object.entries(done).forEach(([id, ts]) => { if (ymdOf(ts) === dt) acts.push({ at: ts, html: `<span class="badge badge-pending">履修</span> ${esc((byId[id] || {}).title || '')} <span class="muted small">${fmtDateTime(ts)}</span>` }); });
  Object.entries(approvals).forEach(([id, x]) => { if (x && ymdOf(x.at) === dt) acts.push({ at: x.at, html: `<span class="badge badge-approved">承認</span> ${esc((byId[id] || {}).title || '')} <span class="muted small">${esc(x.by || '')} ${fmtDateTime(x.at)}</span>` }); });
  Object.entries(memos).forEach(([id, m]) => { if (m && ymdOf(m.at) === dt) acts.push({ at: m.at, html: `<span class="badge badge-type">📝メモ</span> ${esc((byId[id] || {}).title || '')}：${esc(m.text)}` }); });
  acts.sort((x, y) => (x.at || 0) - (y.at || 0));
  const conf = rep ? Object.values(rep.confirmations || {}) : [];
  const legend = `<span><i class="dot dot-b"></i>日報を出した日</span><span><i class="dot dot-a"></i>メモを書いた日</span><span>✓ 履修・承認の数</span>`;
  wrap.innerHTML = `${calendarHtml(myCal.y, myCal.m, myDayMarks(), dt, legend)}
    <div class="day-panel">
      <h4>${fmtYmd(dt)} の日報</h4>
      ${rep
        ? reportBodyHtml(rep) + `<div class="confirms">${conf.length ? conf.map(c => `<span class="chip-ok">✅ ${esc(c.name)}</span>`).join('') : '<span class="muted">責任者の確認待ち</span>'}</div>`
        : `<p class="muted small">この日の日報はありません</p>${dt <= todayStr() ? `<button class="btn btn-ghost btn-sm" data-write-day="${dt}">この日の日報を書く</button>` : ''}`}
      <h4>${fmtYmd(dt)} の履修・承認・メモ</h4>
      ${acts.length ? `<ul class="day-list">${acts.map(a => `<li>${a.html}</li>`).join('')}</ul>` : '<p class="muted small">この日の記録はありません</p>'}
    </div>`;
}
