/* ===== 責任者側 ===== */

let me = null;
let employees = [], items = [], template = [], admins = [], reports = [];
const progressMap = {}, approvalsMap = {}, unlockedMap = {};
let appSettings = { phaseLock: false };
let reportFilter = 'all', reportEmp = '';
let currentEmp = null, empNotes = [], empReports = [];
let tplDraft = [];

const pubItems = () => items.filter(i => i.published !== false);
const activeEmployees = () => employees.filter(e => e.active !== false);

document.addEventListener('DOMContentLoaded', () => {
  applyAppName('責任者');
  bindLoginForm();
  $('#blocked-logout').addEventListener('click', () => auth.signOut());
  $('#btn-logout').addEventListener('click', () => { if (confirm('ログアウトしますか？')) auth.signOut(); });
  $$('.tabbar button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  $('#pending-list').addEventListener('click', onPendingClick);

  $('#btn-add-emp').addEventListener('click', openAddEmployee);
  $('#emp-list').addEventListener('click', e => {
    const card = e.target.closest('[data-emp]');
    if (card) openEmployee(card.dataset.emp);
  });
  $('#btn-emp-back').addEventListener('click', closeEmployee);
  $('#emp-detail').addEventListener('click', onEmpDetailClick);

  $$('[data-rfilter]').forEach(c => c.addEventListener('click', () => {
    reportFilter = c.dataset.rfilter;
    $$('[data-rfilter]').forEach(x => x.classList.toggle('active', x === c));
    renderReports();
  }));
  $('#report-emp-filter').addEventListener('change', e => { reportEmp = e.target.value; renderReports(); });
  $('#reports-list').addEventListener('click', onReportClick);

  $('#btn-add-item').addEventListener('click', () => openItemModal(null));
  $('#btn-bulk-items').addEventListener('click', openBulkModal);
  $('#items-list').addEventListener('click', onItemsClick);
  bindItemDrag();
  $('#items-phase-chips').addEventListener('click', e => {
    const ph = e.target.closest('[data-iphase]');
    if (ph) { itemsPhase = ph.dataset.iphase; renderItems(); }
  });
  $('#type-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-type]');
    if (b) { itemsType = b.dataset.type; renderItems(); }
  });

  $('#tpl-list').addEventListener('click', onTplClick);
  $('#tpl-add').addEventListener('click', addTplRow);
  $('#tpl-new').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addTplRow(); } });
  $('#tpl-save').addEventListener('click', saveTemplate);
  $('#btn-add-admin').addEventListener('click', openAddAdmin);
  $('#admin-list').addEventListener('click', onAdminListClick);
  $('#btn-edit-my-name').addEventListener('click', editMyName);
  $('#phase-lock').addEventListener('change', async e => {
    const on = e.target.checked;
    if (on && !confirm('段階の許可制をオンにします。\n許可していない段階は社員に表示されなくなります。\nいま進行中の段階と最初の段階は、全員分を自動で許可します。よろしいですか？')) { e.target.checked = false; return; }
    e.target.disabled = true;
    try {
      if (on) await autoUnlockAll();
      await db.doc('settings/app').set({ phaseLock: on, updatedAt: FV.serverTimestamp() }, { merge: true });
      appSettings.phaseLock = on;
      renderEmployees();
      if (currentEmp) renderEmpDetail();
      toast(on ? '段階の許可制をオンにしました' : '段階の許可制をオフにしました', 'ok');
    } catch (err) {
      toast(authErrorMessage(err), 'err');
      e.target.checked = !on;
    } finally { e.target.disabled = false; }
  });
  bindRefresh(refreshAll);

  auth.onAuthStateChanged(onAuth);
});

/* 最新の状態に更新（開いている社員詳細はそのまま開き直す） */
async function refreshAll(btn) {
  if (!me || (btn && btn.disabled)) return;
  setBusy(btn, true, '更新中…');
  try {
    if (await checkForNewVersion(true)) return;
    const openId = currentEmp ? currentEmp.id : null;
    await loadAll();
    renderAll();
    if (openId) await openEmployee(openId);
    toast('最新の状態に更新しました', 'ok');
  } catch (err) {
    toast(authErrorMessage(err), 'err');
  } finally {
    setBusy(btn, false);
  }
}

/* ---- 認証 ---- */
async function onAuth(user) {
  if (!user) { me = null; showView('view-login'); return; }
  showView('view-loading');
  const email = (user.email || '').toLowerCase();
  try {
    const adm = await db.doc('admins/' + email).get();
    if (!adm.exists) {
      showBlocked('このアカウントは責任者として登録されていません。責任者に「責任者を追加」してもらうか、社員画面からログインしてください。');
      return;
    }
    me = { uid: user.uid, email, name: adm.data().name || email };
    $('#me-name').textContent = me.name;
    await loadAll();
    renderAll();
    setTab('pending');
    showView('view-main');
    checkForNewVersion(false);
  } catch (err) {
    showBlocked('読み込みに失敗しました：' + authErrorMessage(err));
  }
}

function showBlocked(msg) {
  $('#blocked-msg').textContent = msg;
  showView('view-blocked');
}

/* ---- データ読み込み ---- */
async function loadAll() {
  const [empSnap, it, tpl, admSnap, repSnap, app] = await Promise.all([
    db.collection('employees').get(),
    fetchItems(false),
    fetchTemplate(),
    db.collection('admins').get(),
    db.collection('reports').orderBy('createdAt', 'desc').limit(150).get(),
    fetchAppSettings(),
  ]);
  appSettings = app;
  employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
  items = it;
  template = tpl;
  tplDraft = [...tpl];
  admins = admSnap.docs.map(d => ({ email: d.id, ...d.data() }));
  reports = repSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  await loadProgress();
  markLoaded();
}

async function loadProgress() {
  const results = await Promise.all(employees.flatMap(e => [
    db.doc('progress/' + e.id).get(),
    db.doc('approvals/' + e.id).get(),
  ]));
  employees.forEach((e, i) => {
    const p = results[i * 2], a = results[i * 2 + 1];
    progressMap[e.id] = p.exists ? (p.data().done || {}) : {};
    approvalsMap[e.id] = a.exists ? (a.data().items || {}) : {};
    unlockedMap[e.id] = a.exists ? (a.data().unlocked || {}) : {};
  });
}

async function reloadItems() {
  items = await fetchItems(false);
}

function renderAll() {
  renderPending();
  renderEmployees();
  renderReportFilter();
  renderReports();
  renderItems();
  renderTemplate();
  renderAdmins();
  renderPhaseLockSetting();
  $('#my-name-disp').textContent = me.name;
}

/* ---- 段階の許可 ---- */
function phaseListFor() { return groupByPhase(pubItems()); }
function canUnlockNext(uid) {
  if (!appSettings.phaseLock) return null;
  const phases = phaseListFor();
  const locked = phases.filter(p => !unlockedMap[uid] || !unlockedMap[uid][p.name]);
  if (!locked.length) return null;
  const open = phases.filter(p => unlockedMap[uid] && unlockedMap[uid][p.name]);
  const allDone = open.every(p => p.items.every(i => statusOf(i.id, progressMap[uid], approvalsMap[uid]) === 'approved'));
  return { next: locked[0].name, ready: open.length === 0 || allDone };
}
async function setPhaseUnlocked(uid, name, on) {
  if (on) {
    await db.doc('approvals/' + uid).set({ unlocked: { [name]: true } }, { merge: true });
  } else {
    await db.doc('approvals/' + uid).update(new firebase.firestore.FieldPath('unlocked', name), FV.delete())
      .catch(err => { if (err && err.code === 'not-found') return; throw err; });
  }
  unlockedMap[uid] = { ...(unlockedMap[uid] || {}) };
  if (on) unlockedMap[uid][name] = true; else delete unlockedMap[uid][name];
}
/* 許可制をオンにするとき、進行中の段階と最初の段階を自動で許可する */
async function autoUnlockAll() {
  const phases = phaseListFor();
  if (!phases.length) return;
  const batch = db.batch();
  employees.forEach(e => {
    const map = { ...(unlockedMap[e.id] || {}) };
    phases.forEach((p, k) => {
      const active = p.items.some(i => statusOf(i.id, progressMap[e.id], approvalsMap[e.id]) !== 'none');
      if (k === 0 || active) map[p.name] = true;
    });
    unlockedMap[e.id] = map;
    batch.set(db.doc('approvals/' + e.id), { unlocked: map }, { merge: true });
  });
  await batch.commit();
}
function renderPhaseLockSetting() {
  const cb = $('#phase-lock');
  if (cb) cb.checked = !!appSettings.phaseLock;
}

/* ================= 確認待ち ================= */
function pendingFor(uid) {
  return pubItems().filter(i => statusOf(i.id, progressMap[uid], approvalsMap[uid]) === 'pending');
}

function renderPending() {
  const wrap = $('#pending-list');
  const cards = [];
  let total = 0;
  for (const e of activeEmployees()) {
    const pend = pendingFor(e.id);
    if (!pend.length) continue;
    total += pend.length;
    cards.push(`<div class="card">
      <div class="card-head"><b>${esc(e.name)}</b><button class="btn btn-ghost btn-sm" data-approve-all="${e.id}">すべて承認（${pend.length}）</button></div>
      ${pend.map(i => `<div class="row">
        <div class="row-main"><span class="badge badge-type">${TYPE_LABELS[i.type] || ''}</span> ${esc(i.title)}
          <div class="muted small">${esc([i.phase, i.group].filter(Boolean).join(' / '))}${[i.phase, i.group].some(Boolean) ? '　' : ''}${fmtDateTime(progressMap[e.id][i.id])} に履修</div></div>
        <button class="btn btn-primary btn-sm" data-approve="${e.id}" data-item="${i.id}">✅ 承認</button>
      </div>`).join('')}
    </div>`);
  }
  const unconf = reports.filter(r => !(r.confirmations || {})[me.uid]).length;
  $('#pending-summary').innerHTML = `
    <div class="stat"><b>${total}</b><span>確認待ち</span></div>
    <div class="stat"><b>${unconf}</b><span>未確認の日報</span></div>
    <div class="stat"><b>${activeEmployees().length}</b><span>社員</span></div>`;
  const badge = $('#tab-badge-pending');
  badge.textContent = total;
  badge.hidden = !total;
  wrap.innerHTML = cards.length ? cards.join('') : '<p class="empty">確認待ちの項目はありません</p>';
}

async function onPendingClick(e) {
  const one = e.target.closest('[data-approve]');
  if (one) { await doApprove(one.dataset.approve, [one.dataset.item], one); return; }
  const all = e.target.closest('[data-approve-all]');
  if (all) {
    const uid = all.dataset.approveAll;
    const ids = pendingFor(uid).map(i => i.id);
    if (!ids.length) return;
    if (!confirm(`${ids.length} 件をまとめて承認しますか？`)) return;
    await doApprove(uid, ids, all);
  }
}

async function doApprove(uid, itemIds, btn) {
  setBusy(btn, true, '…');
  try {
    const now = Date.now();
    const entry = {};
    for (const id of itemIds) entry[id] = { at: now, by: me.name };
    await db.doc('approvals/' + uid).set({ items: entry }, { merge: true });
    approvalsMap[uid] = { ...(approvalsMap[uid] || {}), ...entry };
    toast(itemIds.length > 1 ? `${itemIds.length} 件を承認しました` : '承認しました', 'ok');
    renderPending(); renderEmployees();
    if (currentEmp && currentEmp.id === uid) renderEmpDetail();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

async function doUnapprove(uid, itemId, btn) {
  if (!confirm('承認を取り消しますか？（社員側は「確認待ち」に戻ります）')) return;
  setBusy(btn, true, '…');
  try {
    await db.doc('approvals/' + uid).update({ ['items.' + itemId]: FV.delete() });
    if (approvalsMap[uid]) delete approvalsMap[uid][itemId];
    toast('承認を取り消しました');
    renderPending(); renderEmployees();
    if (currentEmp && currentEmp.id === uid) renderEmpDetail();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

/* ================= 社員 ================= */
function renderEmployees() {
  const wrap = $('#emp-list');
  const pub = pubItems();
  if (!employees.length) {
    wrap.innerHTML = '<p class="empty">社員はまだいません。「社員を追加」から登録します</p>';
    return;
  }
  wrap.innerHTML = employees.map(e => {
    const s = progressSummary(pub, progressMap[e.id], approvalsMap[e.id]);
    const pct = s.total ? Math.round(s.approved / s.total * 100) : 0;
    const last = reports.find(r => r.uid === e.id);
    return `<div class="card emp-card ${e.active === false ? 'inactive' : ''}" data-emp="${e.id}">
      <div class="card-head"><b>${esc(e.name)}</b>
        ${e.active === false ? '<span class="badge badge-none">停止中</span>' : ''}
        ${s.pending ? `<span class="badge badge-pending">確認待ち ${s.pending}</span>` : ''}
        ${(() => { const n = canUnlockNext(e.id); return n && n.ready ? `<span class="badge badge-approved">「${esc(n.next)}」を許可できます</span>` : ''; })()}
      </div>
      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="emp-meta"><span>承認 ${s.approved}/${s.total}（${pct}%）</span><span>最終日報 ${last ? fmtYmd(last.date) : 'なし'}</span></div>
    </div>`;
  }).join('');
}

function openAddEmployee() {
  openModal(`<h3>社員を追加</h3>
    <form id="emp-form">
      <label>名前<input id="ef-name" required placeholder="例：山田 太郎"></label>
      <label>メールアドレス（ログインID）<input id="ef-email" type="email" required inputmode="email" autocapitalize="off" autocomplete="off"></label>
      <label>初期パスワード（6文字以上）<input id="ef-pw" type="text" required minlength="6" autocomplete="off" autocapitalize="off"></label>
      <p class="muted small">作成後、メールアドレスと初期パスワードを本人に伝えてください</p>
      <p id="ef-error" class="error"></p>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="ef-cancel">キャンセル</button>
        <button type="submit" class="btn btn-primary" id="ef-submit">作成する</button>
      </div>
    </form>`);
  $('#ef-cancel').addEventListener('click', closeModal);
  $('#emp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#ef-name').value.trim();
    const email = $('#ef-email').value.trim().toLowerCase();
    const pw = $('#ef-pw').value;
    const errEl = $('#ef-error');
    errEl.textContent = '';
    const btn = $('#ef-submit');
    setBusy(btn, true, '作成中…');
    try {
      const uid = await createAuthUser(email, pw);
      await db.doc('employees/' + uid).set({ name, email, active: true, createdAt: FV.serverTimestamp() });
      employees.push({ id: uid, name, email, active: true });
      employees.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
      progressMap[uid] = {}; approvalsMap[uid] = {};
      renderEmployees(); renderReportFilter(); renderPending();
      showCreated('社員を作成しました', name, email, pw);
    } catch (err) {
      errEl.textContent = authErrorMessage(err);
      setBusy(btn, false);
    }
  });
}

function showCreated(title, name, email, pw) {
  openModal(`<h3>${esc(title)}</h3>
    <p>本人に伝える内容：</p>
    <div class="cred-box" id="cred-text">名前：${esc(name)}<br>メール：${esc(email)}<br>パスワード：${esc(pw)}<br>ログイン：${esc(location.href.replace(/admin\.html.*$/, '').replace(/#.*$/, ''))}</div>
    <div class="btn-row">
      <button type="button" class="btn btn-ghost" id="cred-copy">コピー</button>
      <button type="button" class="btn btn-primary" id="cred-close">閉じる</button>
    </div>`);
  $('#cred-close').addEventListener('click', closeModal);
  $('#cred-copy').addEventListener('click', async () => {
    const text = $('#cred-text').innerText;
    try { await navigator.clipboard.writeText(text); toast('コピーしました', 'ok'); }
    catch (e) { toast('コピーできませんでした。長押しで選択してください', 'err'); }
  });
}

async function openEmployee(id) {
  currentEmp = employees.find(e => e.id === id);
  if (!currentEmp) return;
  $('#emp-list-view').hidden = true;
  $('#emp-detail-view').hidden = false;
  $('#emp-detail').innerHTML = '<div class="spinner"></div>';
  window.scrollTo(0, 0);
  try {
    const [noteSnap, repSnap] = await Promise.all([
      db.doc('notes/' + id).get(),
      db.collection('reports').where('uid', '==', id).get(),
    ]);
    empNotes = noteSnap.exists ? (noteSnap.data().entries || []) : [];
    empReports = repSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderEmpDetail();
  } catch (err) {
    $('#emp-detail').innerHTML = `<p class="error">${esc(authErrorMessage(err))}</p>`;
  }
}

function closeEmployee() {
  currentEmp = null;
  $('#emp-detail-view').hidden = true;
  $('#emp-list-view').hidden = false;
  renderEmployees();
}

function renderEmpDetail() {
  const e = currentEmp;
  if (!e) return;
  const done = progressMap[e.id] || {}, appr = approvalsMap[e.id] || {};
  const pub = pubItems();
  const s = progressSummary(pub, done, appr);
  const notes = [...empNotes].sort((a, b) => (b.at || 0) - (a.at || 0));

  const phases = groupByPhase(pub);
  const itemsHtml = phases.map(p => {
    const ps = progressSummary(p.items, done, appr);
    const lockMark = appSettings.phaseLock && !(unlockedMap[e.id] || {})[p.name] ? '🔒 ' : '';
    return `${phases.length > 1 ? `<h3 class="phase-title">${lockMark}${esc(p.name)} <span class="muted small">${ps.approved} / ${ps.total}</span></h3>` : ''}` +
      p.groups.map(g => `<h3 class="section-title">${esc(g.name)}</h3>${g.items.map(i => {
    const st = statusOf(i.id, done, appr);
    let action = '';
    if (st === 'pending') action = `<button class="btn btn-primary btn-sm" data-approve="${i.id}">✅ 承認</button>`;
    else if (st === 'approved') action = `<button class="btn btn-ghost btn-sm" data-unapprove="${i.id}">取消</button>`;
    else action = `<button class="btn btn-ghost btn-sm" data-approve="${i.id}">承認</button>`;
    const sub = st === 'approved' ? `${esc(appr[i.id].by || '')} ${fmtDateTime(appr[i.id].at)}`
      : st === 'pending' ? `${fmtDateTime(done[i.id])} に履修` : '';
    return `<div class="row">
      <div class="row-main"><span class="badge badge-${st}">${STATUS_LABELS[st]}</span> ${esc(i.title)}${sub ? `<div class="muted small">${sub}</div>` : ''}</div>
      ${action}
    </div>`;
  }).join('')}`).join('');
  }).join('');

  $('#emp-detail').innerHTML = `
    <div class="card">
      <div class="card-head"><h2>${esc(e.name)}</h2>${e.active === false ? '<span class="badge badge-none">停止中</span>' : ''}<button class="btn btn-ghost btn-sm" data-act="rename">名前を変更</button></div>
      <p class="muted small">${esc(e.email || '')}</p>
      <div class="btn-row">
        <button class="btn btn-ghost btn-sm" data-act="reset-pw">パスワード再設定メール</button>
        <button class="btn ${e.active === false ? 'btn-primary' : 'btn-danger'} btn-sm" data-act="toggle-active">${e.active === false ? 'アカウントを再開' : 'アカウントを停止'}</button>
      </div>
    </div>

    <div class="card">
      <h3>責任者メモ <span class="muted small">（社員には表示されません）</span></h3>
      <div id="notes-list">${notes.length ? notes.map((n, idx) => `<div class="note">
        <div class="note-meta"><span>${esc(n.author || '')}</span><span>${fmtDateTime(n.at)}</span><button class="btn btn-ghost btn-sm" data-del-note="${idx}">削除</button></div>
        <p>${esc(n.text)}</p>
      </div>`).join('') : '<p class="muted small">まだメモはありません</p>'}</div>
      <label>メモを追加<textarea id="note-text" rows="3" placeholder="気づき・申し送りなど"></textarea></label>
      <button class="btn btn-primary btn-block" data-act="add-note">メモを追加</button>
    </div>

    ${appSettings.phaseLock ? `<div class="card">
      <h3>段階の許可 <span class="muted small">オンにした段階だけ社員に表示されます</span></h3>
      ${phases.length ? phases.map(p => {
        const on = !!(unlockedMap[e.id] || {})[p.name];
        const ps = progressSummary(p.items, done, appr);
        return `<div class="row">
          <div class="row-main">${on ? '' : '🔒 '}${esc(p.name)}<div class="muted small">${ps.approved} / ${ps.total} 承認${ps.pending ? `・確認待ち ${ps.pending}` : ''}</div></div>
          <button class="btn ${on ? 'btn-ghost' : 'btn-primary'} btn-sm" data-unlock="${esc(p.name)}" data-on="${on ? '0' : '1'}">${on ? '許可を取り消す' : '許可する'}</button>
        </div>`;
      }).join('') : '<p class="muted small">公開中の項目がありません</p>'}
      ${(() => { const n = canUnlockNext(e.id); return n ? `<button class="btn btn-primary btn-block" data-unlock="${esc(n.next)}" data-on="1">次の段階「${esc(n.next)}」を許可する</button>` : ''; })()}
    </div>` : ''}

    <div class="card">
      <h3>教育項目 <span class="muted small">承認 ${s.approved}/${s.total}・確認待ち ${s.pending}</span></h3>
      ${stampGrid(pub, done, appr)}
      ${itemsHtml || '<p class="muted small">公開中の項目がありません</p>'}
    </div>

    <div class="card">
      <h3>日報 <span class="muted small">${empReports.length} 件</span></h3>
      <div id="emp-reports">${empReports.length ? empReports.slice(0, 30).map(r => reportCard(r)).join('') : '<p class="muted small">まだ日報はありません</p>'}</div>
    </div>`;
  window.__notesSorted = notes;
}

async function onEmpDetailClick(ev) {
  const e = currentEmp;
  if (!e) return;
  const t = ev.target;
  const approveBtn = t.closest('[data-approve]');
  if (approveBtn) { await doApprove(e.id, [approveBtn.dataset.approve], approveBtn); return; }
  const unBtn = t.closest('[data-unapprove]');
  if (unBtn) { await doUnapprove(e.id, unBtn.dataset.unapprove, unBtn); return; }
  const confBtn = t.closest('[data-confirm]');
  if (confBtn) { await toggleConfirm(confBtn.dataset.confirm, confBtn); return; }
  const unlockBtn = t.closest('[data-unlock]');
  if (unlockBtn) {
    const on = unlockBtn.dataset.on === '1';
    if (!on && !confirm(`「${unlockBtn.dataset.unlock}」の許可を取り消しますか？（社員側で見えなくなります。履修・承認の記録は残ります）`)) return;
    setBusy(unlockBtn, true, '…');
    try {
      await setPhaseUnlocked(e.id, unlockBtn.dataset.unlock, on);
      renderEmpDetail(); renderEmployees();
      toast(on ? `「${unlockBtn.dataset.unlock}」を許可しました` : '許可を取り消しました', 'ok');
    } catch (err) { toast(authErrorMessage(err), 'err'); setBusy(unlockBtn, false); }
    return;
  }
  const delNote = t.closest('[data-del-note]');
  if (delNote) {
    const entry = (window.__notesSorted || [])[Number(delNote.dataset.delNote)];
    if (!entry || !confirm('このメモを削除しますか？')) return;
    try {
      await db.doc('notes/' + e.id).update({ entries: FV.arrayRemove(entry) });
      empNotes = empNotes.filter(n => !(n.at === entry.at && n.text === entry.text && n.author === entry.author));
      renderEmpDetail();
    } catch (err) { toast(authErrorMessage(err), 'err'); }
    return;
  }
  const act = t.closest('[data-act]');
  if (!act) return;
  const kind = act.dataset.act;

  if (kind === 'add-note') {
    const text = $('#note-text').value.trim();
    if (!text) { toast('メモを入力してください', 'err'); return; }
    const entry = { text, author: me.name, at: Date.now() };
    setBusy(act, true);
    try {
      await db.doc('notes/' + e.id).set({ entries: FV.arrayUnion(entry) }, { merge: true });
      empNotes.push(entry);
      renderEmpDetail();
      toast('メモを追加しました', 'ok');
    } catch (err) { toast(authErrorMessage(err), 'err'); setBusy(act, false); }
  } else if (kind === 'rename') {
    const name = prompt('新しい名前', e.name);
    if (!name || name.trim() === e.name) return;
    try {
      await db.doc('employees/' + e.id).update({ name: name.trim() });
      e.name = name.trim();
      employees.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
      renderEmpDetail();
      toast('名前を変更しました', 'ok');
    } catch (err) { toast(authErrorMessage(err), 'err'); }
  } else if (kind === 'toggle-active') {
    const next = e.active === false;
    if (!confirm(next ? 'アカウントを再開しますか？' : 'アカウントを停止しますか？（停止中はログインしても使えなくなります）')) return;
    try {
      await db.doc('employees/' + e.id).update({ active: next });
      e.active = next;
      renderEmpDetail(); renderPending();
      toast(next ? '再開しました' : '停止しました', 'ok');
    } catch (err) { toast(authErrorMessage(err), 'err'); }
  } else if (kind === 'reset-pw') {
    if (!e.email || !confirm(`${e.email} にパスワード再設定メールを送りますか？`)) return;
    try {
      await auth.sendPasswordResetEmail(e.email);
      toast('再設定メールを送りました', 'ok');
    } catch (err) { toast(authErrorMessage(err), 'err'); }
  }
}

/* ================= 日報 ================= */
function renderReportFilter() {
  const sel = $('#report-emp-filter');
  sel.innerHTML = '<option value="">全員</option>' + employees.map(e => `<option value="${e.id}" ${reportEmp === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('');
}

function reportCard(r) {
  const conf = Object.values(r.confirmations || {});
  const mine = !!(r.confirmations || {})[me.uid];
  const checks = r.checks || [];
  const doneN = checks.filter(c => c.done).length;
  return `<div class="card" data-report="${r.id}">
    <div class="report-head"><b>${esc(r.name || '')}</b><span class="date">${fmtYmd(r.date)}</span>${checks.length ? `<span class="right">チェック ${doneN}/${checks.length}</span>` : ''}</div>
    ${checks.length ? `<ul class="check-list">${checks.map(c => `<li class="${c.done ? 'on' : ''}">${c.done ? '☑' : '☐'} ${esc(c.label)}</li>`).join('')}</ul>` : ''}
    ${r.text ? `<p class="report-text">${esc(r.text)}</p>` : ''}
    <div class="confirms">${conf.length ? conf.map(c => `<span class="chip-ok">✅ ${esc(c.name)}</span>`).join('') : '<span class="muted">まだ誰も確認していません</span>'}</div>
    <button class="btn ${mine ? 'btn-ghost' : 'btn-primary'} btn-sm" data-confirm="${r.id}">${mine ? '確認を取り消す' : '✅ 確認した'}</button>
  </div>`;
}

function renderReports() {
  const wrap = $('#reports-list');
  let list = reports;
  if (reportEmp) list = list.filter(r => r.uid === reportEmp);
  if (reportFilter === 'unconfirmed') list = list.filter(r => !(r.confirmations || {})[me.uid]);
  if (!list.length) {
    wrap.innerHTML = `<p class="empty">${reports.length ? '該当する日報はありません' : 'まだ日報は提出されていません'}</p>`;
    return;
  }
  wrap.innerHTML = list.map(r => reportCard(r)).join('');
}

async function onReportClick(e) {
  const btn = e.target.closest('[data-confirm]');
  if (btn) await toggleConfirm(btn.dataset.confirm, btn);
}

async function toggleConfirm(id, btn) {
  const r = reports.find(x => x.id === id) || empReports.find(x => x.id === id);
  if (!r) return;
  const mine = !!(r.confirmations || {})[me.uid];
  setBusy(btn, true, '…');
  try {
    const value = mine ? FV.delete() : { name: me.name, at: Date.now() };
    await db.doc('reports/' + id).update({ ['confirmations.' + me.uid]: value });
    for (const arr of [reports, empReports]) {
      const x = arr.find(y => y.id === id);
      if (!x) continue;
      x.confirmations = { ...(x.confirmations || {}) };
      if (mine) delete x.confirmations[me.uid]; else x.confirmations[me.uid] = { name: me.name, at: Date.now() };
    }
    toast(mine ? '確認を取り消しました' : '確認しました', 'ok');
    renderReports(); renderPending();
    if (currentEmp) renderEmpDetail();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    setBusy(btn, false);
  }
}

/* ================= 教育項目 ================= */
let itemsPhase = '*';
let itemsType = 'all';

function renderItems() {
  const wrap = $('#items-list');
  if (!items.length) {
    $('#items-phase-chips').innerHTML = '';
    renderTypeSeg($('#type-seg'), [], itemsType);
    wrap.innerHTML = '<p class="empty">項目はまだありません。「まとめ登録」で一気に登録できます</p>';
    return;
  }
  const allPhases = groupByPhase(items);
  if (itemsPhase !== '*' && !allPhases.some(p => p.name === itemsPhase)) itemsPhase = '*';
  $('#items-phase-chips').innerHTML = allPhases.length > 1
    ? `<button class="chip ${itemsPhase === '*' ? 'active' : ''}" data-iphase="*">すべて</button>` +
      allPhases.map(p => `<button class="chip ${p.name === itemsPhase ? 'active' : ''}" data-iphase="${esc(p.name)}">${esc(p.name)}</button>`).join('')
    : '';
  const inPhase = itemsPhase === '*' ? items : items.filter(i => phaseName(i) === itemsPhase);
  renderTypeSeg($('#type-seg'), inPhase, itemsType);
  const filtered = inPhase.filter(i => itemsType === 'all' || (i.type || 'check') === itemsType);
  if (!filtered.length) { wrap.innerHTML = '<p class="empty">該当する項目はありません</p>'; return; }
  const phases = groupByPhase(filtered);
  const shown = phases;
  wrap.innerHTML = shown.map(p => `
    ${allPhases.length > 1 && itemsPhase === '*' ? `<h3 class="phase-title">${esc(p.name)}<button type="button" class="rename-btn" data-rename-phase="${esc(p.name)}">名前を変更</button></h3>` : ''}
    ${p.groups.map(g => `<h3 class="section-title">${esc(g.name)}<button type="button" class="rename-btn" data-rename-group="${esc(g.name)}" data-in-phase="${esc(p.name)}">名前を変更</button></h3>
    <div class="group-list">${g.items.map(i => `
      <div class="row item-row ${i.published === false ? 'unpub' : ''}" data-id="${i.id}">
        <span class="drag-handle" data-drag="${i.id}" title="ドラッグで並び替え">☰</span>
        <div class="order-btns"><button type="button" data-move="${i.id}" data-dir="-1">▲</button><button type="button" data-move="${i.id}" data-dir="1">▼</button></div>
        <div class="row-main" data-edit="${i.id}">
          <span class="badge badge-type">${TYPE_LABELS[i.type] || ''}</span>${i.published === false ? ' <span class="badge badge-none">非公開</span>' : ''} ${esc(i.title)}
          ${i.description ? `<div class="muted small clamp">${esc(i.description)}</div>` : ''}
        </div>
      </div>`).join('')}</div>`).join('')}`).join('');
}

async function onItemsClick(e) {
  const rp = e.target.closest('[data-rename-phase]');
  if (rp) { await renameLabel('phase', rp.dataset.renamePhase, null); return; }
  const rg = e.target.closest('[data-rename-group]');
  if (rg) { await renameLabel('group', rg.dataset.renameGroup, rg.dataset.inPhase); return; }
  const mv = e.target.closest('[data-move]');
  if (mv) { await moveItem(mv.dataset.move, Number(mv.dataset.dir)); return; }
  const ed = e.target.closest('[data-edit]');
  if (ed) openItemModal(items.find(i => i.id === ed.dataset.edit));
}

/* 段階／カテゴリの名前をまとめて変更（同じ名前にすれば別枠になっていたものが1つにまとまる） */
async function renameLabel(kind, oldName, inPhase) {
  const label = kind === 'phase' ? '段階' : 'カテゴリ';
  const targets = items.filter(i => kind === 'phase'
    ? phaseName(i) === oldName
    : (((i.group || '').trim() || 'その他') === oldName && (inPhase == null || phaseName(i) === inPhase)));
  if (!targets.length) return;
  const input = prompt(`${label}「${oldName}」の新しい名前（${targets.length} 件をまとめて変更します）`, oldName === 'その他' || oldName === '全般' ? '' : oldName);
  if (input == null) return;
  const newName = input.trim();
  if (newName === oldName) return;
  try {
    const batch = db.batch();
    targets.forEach(i => batch.update(db.doc('items/' + i.id), { [kind]: newName }));
    await batch.commit();
    targets.forEach(i => { i[kind] = newName; });
    renderItems(); renderPending(); renderEmployees();
    toast(`${label}を「${newName || (kind === 'phase' ? '全般' : 'その他')}」に変更しました`, 'ok');
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    await reloadItems(); renderItems();
  }
}

/* 同じ段階・カテゴリの中の項目（並び順）*/
function siblingsOf(item) {
  return items.filter(i => phaseName(i) === phaseName(item) && ((i.group || '').trim() || 'その他') === ((item.group || '').trim() || 'その他'))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
/* order が重複・未設定なら全体を振り直す（1回きり） */
async function ensureUniqueOrders() {
  const seen = new Set(); let bad = false;
  for (const it of items) { if (typeof it.order !== 'number' || seen.has(it.order)) { bad = true; break; } seen.add(it.order); }
  if (!bad) return;
  items.forEach((it, k) => { it.order = k; });
  const batch = db.batch();
  items.forEach(it => batch.update(db.doc('items/' + it.id), { order: it.order }));
  await batch.commit();
}
/* ids の順に、その並びの order 値を割り当て直して保存 */
async function applyOrder(ids) {
  const targets = ids.map(id => items.find(i => i.id === id)).filter(Boolean);
  const orders = targets.map(i => i.order).sort((a, b) => a - b);
  const changed = [];
  targets.forEach((it, k) => { if (it.order !== orders[k]) { it.order = orders[k]; changed.push(it); } });
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (!changed.length) return;
  const batch = db.batch();
  changed.forEach(it => batch.update(db.doc('items/' + it.id), { order: it.order }));
  await batch.commit();
}

async function moveItem(id, dir) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  try {
    await ensureUniqueOrders();
    const sib = siblingsOf(item);
    const idx = sib.findIndex(i => i.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sib.length) { toast(dir < 0 ? 'いちばん上です' : 'いちばん下です'); return; }
    const ids = sib.map(i => i.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await applyOrder(ids);
    renderItems();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
    await reloadItems(); renderItems();
  }
}

/* ---- ドラッグで並び替え（同じカテゴリの中） ---- */
let drag = null;
function bindItemDrag() {
  const wrap = $('#items-list');
  wrap.addEventListener('pointerdown', e => {
    const h = e.target.closest('[data-drag]');
    if (!h) return;
    const row = h.closest('.item-row');
    const list = row && row.parentElement;
    if (!list) return;
    e.preventDefault();
    try { h.setPointerCapture(e.pointerId); } catch (err) {}
    drag = { row, list, handle: h, moved: false };
    row.classList.add('dragging');
  });
  wrap.addEventListener('pointermove', e => {
    if (!drag) return;
    e.preventDefault();
    const y = e.clientY;
    const rows = Array.from(drag.list.querySelectorAll('.item-row')).filter(r => r !== drag.row);
    let before = null;
    for (const r of rows) {
      const rect = r.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) { before = r; break; }
    }
    const cur = drag.row.nextElementSibling;
    if (before !== cur) {
      if (before) drag.list.insertBefore(drag.row, before); else drag.list.appendChild(drag.row);
      drag.moved = true;
    }
    if (y < 90) window.scrollBy(0, -12); else if (y > window.innerHeight - 90) window.scrollBy(0, 12);
  });
  const end = async e => {
    if (!drag) return;
    const { row, list, moved } = drag;
    drag = null;
    row.classList.remove('dragging');
    if (!moved) return;
    const ids = Array.from(list.querySelectorAll('.item-row')).map(r => r.dataset.id);
    try {
      await ensureUniqueOrders();
      await applyOrder(ids);
      toast('並び順を保存しました', 'ok');
    } catch (err) {
      toast(authErrorMessage(err), 'err');
      await reloadItems(); renderItems();
    }
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
}

/* 入力欄の下に、登録済みの値をタップで選べるボタンを出す */
function valueChips(inputId, values) {
  if (!values.length) return '';
  return `<div class="value-chips" data-for="${inputId}">${values.map(v => `<button type="button" class="chip" data-value="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
}
function bindValueChips(root) {
  $$('.value-chips', root).forEach(box => {
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-value]');
      if (!b) return;
      const input = $('#' + box.dataset.for);
      if (!input) return;
      input.value = b.dataset.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      $$('[data-value]', box).forEach(x => x.classList.toggle('active', x === b));
    });
  });
}
function existingPhases() { return [...new Set(items.map(i => (i.phase || '').trim()).filter(Boolean))]; }
function existingGroups() { return [...new Set(items.map(i => (i.group || '').trim()).filter(Boolean))]; }

function phaseDatalist(id) {
  const phases = [...new Set(items.map(i => (i.phase || '').trim()).filter(Boolean))];
  return `<datalist id="${id}">${phases.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
}

function groupDatalist(id) {
  const groups = [...new Set(items.map(i => (i.group || '').trim()).filter(Boolean))];
  return `<datalist id="${id}">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist>`;
}

function openItemModal(item) {
  const isNew = !item;
  const it = item || { type: 'check', phase: itemsPhase === '*' ? '' : itemsPhase, group: '', title: '', description: '', videoUrl: '', published: true };
  openModal(`<h3>${isNew ? '項目を追加' : '項目を編集'}</h3>
    <form id="item-form">
      <label>種類
        <select id="it-type">${['check', 'text', 'video'].map(t => `<option value="${t}" ${it.type === t ? 'selected' : ''}>${TYPE_LABELS[t]}</option>`).join('')}</select>
      </label>
      <label>段階（任意）
        <input id="it-phase" list="it-phase-list" value="${esc(it.phase || '')}" placeholder="例：1週目" autocomplete="off">
        ${phaseDatalist('it-phase-list')}
      </label>
      ${valueChips('it-phase', existingPhases())}
      <label>カテゴリ（任意）
        <input id="it-group" list="it-group-list" value="${esc(it.group || '')}" placeholder="例：座学系 / 実践編" autocomplete="off">
        ${groupDatalist('it-group-list')}
      </label>
      ${valueChips('it-group', existingGroups())}
      <label>題名<input id="it-title" value="${esc(it.title)}" required></label>
      <label>説明（任意）<textarea id="it-desc" rows="5">${esc(it.description || '')}</textarea></label>
      <label id="it-video-wrap" ${it.type === 'video' ? '' : 'hidden'}>ビデオのURL
        <input id="it-video" type="url" value="${esc(it.videoUrl || '')}" placeholder="https://..." inputmode="url" autocapitalize="off">
      </label>
      <label class="check"><input type="checkbox" id="it-pub" ${it.published !== false ? 'checked' : ''}><span>社員に公開する</span></label>
      <p id="it-error" class="error"></p>
      <div class="btn-row">
        ${isNew ? '' : '<button type="button" class="btn btn-danger" id="it-delete">削除</button>'}
        <button type="button" class="btn btn-ghost" id="it-cancel">キャンセル</button>
        <button type="submit" class="btn btn-primary" id="it-save">保存</button>
      </div>
    </form>`);
  $('#it-type').addEventListener('change', e => { $('#it-video-wrap').hidden = e.target.value !== 'video'; });
  bindValueChips($('#modal'));
  $('#it-cancel').addEventListener('click', closeModal);
  if (!isNew) $('#it-delete').addEventListener('click', async () => {
    if (!confirm(`「${it.title}」を削除しますか？`)) return;
    try {
      await db.doc('items/' + it.id).delete();
      closeModal();
      await reloadItems();
      renderItems(); renderPending(); renderEmployees();
      toast('削除しました');
    } catch (err) { $('#it-error').textContent = authErrorMessage(err); }
  });
  $('#item-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      type: $('#it-type').value,
      phase: $('#it-phase').value.trim(),
      group: $('#it-group').value.trim(),
      title: $('#it-title').value.trim(),
      description: $('#it-desc').value.trim(),
      videoUrl: $('#it-type').value === 'video' ? $('#it-video').value.trim() : '',
      published: $('#it-pub').checked,
      updatedAt: FV.serverTimestamp(),
    };
    if (!data.title) return;
    if (data.type === 'video' && !data.videoUrl) { $('#it-error').textContent = 'ビデオのURLを入れてください'; return; }
    const btn = $('#it-save');
    setBusy(btn, true, '保存中…');
    try {
      if (isNew) {
        data.order = items.length ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 0;
        data.createdAt = FV.serverTimestamp();
        await db.collection('items').add(data);
      } else {
        await db.doc('items/' + it.id).update(data);
      }
      closeModal();
      await reloadItems();
      renderItems(); renderPending(); renderEmployees();
      toast(isNew ? '追加しました' : '保存しました', 'ok');
    } catch (err) {
      $('#it-error').textContent = authErrorMessage(err);
      setBusy(btn, false);
    }
  });
}

const CHECK_CELL = /^(true|false|☐|☑|✓|✔|□|■|x|○|●)$/i;

function makeBulkItem(parts, type, phase, group) {
  parts = parts.map(s => (s || '').trim()).filter(Boolean);
  const title = parts[0] || '';
  let description = '', videoUrl = '';
  for (const p of parts.slice(1)) {
    if (/^https?:\/\//i.test(p) && !videoUrl) videoUrl = p;
    else description = description ? description + '\n' + p : p;
  }
  let t = type;
  if (t === 'auto') t = videoUrl ? 'video' : (description ? 'text' : 'check');
  return { title, description, videoUrl, type: t, phase, group };
}

/* まとめ登録の解析
   - タブ区切り（スプレッドシートからのコピー）：列の位置から 段階／カテゴリ／題名／説明 を判定
   - 手書き：「# 段階」「## カテゴリ」「題名｜説明｜URL」 */
function parseBulk(text, type, defaults = {}) {
  const lines = text.replace(/\r/g, '').split('\n');
  const out = [];
  let phase = (defaults.phase || '').trim();
  let group = (defaults.group || '').trim();
  const hasTab = lines.some(l => l.includes('\t'));

  if (!hasTab) {
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      let m;
      if ((m = line.match(/^##\s*(.+)$/))) { group = m[1].trim(); continue; }
      if ((m = line.match(/^#\s*(.+)$/))) { phase = m[1].trim(); group = (defaults.group || '').trim(); continue; }
      out.push(makeBulkItem(line.split(/\s*(?:｜|\||➡|→)\s*/), type, phase, group));
    }
    return out;
  }

  const rows = lines.map(l => l.split('\t').map(c => c.trim()).map(c => CHECK_CELL.test(c) ? '' : c));
  const firstIdx = rows.map(r => r.findIndex(c => c)).filter(i => i >= 0);
  if (!firstIdx.length) return out;
  // 題名の列 = 一番多く使われている「行の最初の文字がある列」
  const counts = {};
  firstIdx.forEach(i => { counts[i] = (counts[i] || 0) + 1; });
  const titleCol = Number(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
  // 見出しの列 = 題名より左で文字がある列。最後の1列がカテゴリ、それより左は段階
  const headerCols = [...new Set(rows.flatMap(r => r.map((c, i) => (c && i < titleCol) ? i : -1).filter(i => i >= 0)))].sort((a, b) => a - b);
  const groupCol = headerCols.length ? headerCols[headerCols.length - 1] : -1;
  const phaseCols = headerCols.length > 1 ? headerCols.slice(0, -1) : [];
  const phaseVals = {};
  for (const r of rows) {
    if (!r.some(c => c)) continue;
    let phaseChanged = false;
    phaseCols.forEach((col, k) => {
      if (r[col]) {
        phaseVals[col] = r[col];
        phaseCols.slice(k + 1).forEach(c2 => { delete phaseVals[c2]; });
        phaseChanged = true;
      }
    });
    if (phaseChanged) {
      phase = phaseCols.map(c => phaseVals[c]).filter(Boolean).join(' ');
      group = (defaults.group || '').trim();
    }
    if (groupCol >= 0 && r[groupCol]) group = r[groupCol];
    const title = r[titleCol];
    if (!title) continue;
    out.push(makeBulkItem([title, ...r.slice(titleCol + 1)], type, phase, group));
  }
  return out;
}

function openBulkModal() {
  openModal(`<h3>まとめ登録</h3>
    <div class="hint">スプレッドシートの表をコピーしてそのまま貼り付けできます（チェック欄の TRUE/FALSE は無視。「1週目」「座学系」などの見出し行は段階・カテゴリとして自動で認識）。<br>手書きの場合は1行に1項目「題名｜説明」、ビデオは「題名｜説明｜URL」。「# 1週目」「## 座学系」と書くと、そこから下がその段階・カテゴリになります</div>
    <form id="bulk-form">
      <label>種類
        <select id="bk-type">
          <option value="auto">自動（URLあり→ビデオ／説明あり→説明あり／それ以外→チェック）</option>
          <option value="check">すべてチェック</option>
          <option value="text">すべて説明あり</option>
          <option value="video">すべてビデオ</option>
        </select>
      </label>
      <label>段階（貼り付けた中に段階の見出しが無いときに使います）
        <input id="bk-phase" list="bk-phase-list" placeholder="例：1週目" autocomplete="off">
        ${phaseDatalist('bk-phase-list')}
      </label>
      ${valueChips('bk-phase', existingPhases())}
      <label>カテゴリ（貼り付けた中にカテゴリの見出しが無いときに使います）
        <input id="bk-group" list="bk-group-list" placeholder="例：座学系" autocomplete="off">
        ${groupDatalist('bk-group-list')}
      </label>
      ${valueChips('bk-group', existingGroups())}
      <label>項目
        <textarea id="bk-text" rows="10" placeholder="出勤時の挨拶｜元気よく「おはようございます」&#10;タイムカードの押し方&#10;接客マナー動画｜視聴後に責任者へ報告｜https://..."></textarea>
      </label>
      <p id="bk-preview" class="muted small"></p>
      <p id="bk-error" class="error"></p>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="bk-cancel">キャンセル</button>
        <button type="submit" class="btn btn-primary" id="bk-submit">登録する</button>
      </div>
    </form>`);
  const bulkDefaults = () => ({ phase: $('#bk-phase').value, group: $('#bk-group').value });
  const preview = () => {
    const rows = parseBulk($('#bk-text').value, $('#bk-type').value, bulkDefaults());
    if (!rows.length) { $('#bk-preview').innerHTML = ''; return; }
    const byPhase = groupByPhase(rows).map(p => `${esc(p.name)}：${p.groups.map(g => `${esc(g.name)} ${g.items.length}`).join('・')}`);
    $('#bk-preview').innerHTML = `${rows.length} 件を登録します（チェック ${rows.filter(r => r.type === 'check').length}・説明あり ${rows.filter(r => r.type === 'text').length}・ビデオ ${rows.filter(r => r.type === 'video').length}）<br>${byPhase.join('<br>')}`;
  };
  ['bk-text', 'bk-phase', 'bk-group'].forEach(id => $('#' + id).addEventListener('input', preview));
  bindValueChips($('#modal'));
  $('#bk-type').addEventListener('change', preview);
  $('#bk-cancel').addEventListener('click', closeModal);
  $('#bulk-form').addEventListener('submit', async e => {
    e.preventDefault();
    const rows = parseBulk($('#bk-text').value, $('#bk-type').value, bulkDefaults());
    if (!rows.length) { $('#bk-error').textContent = '項目を入力してください'; return; }
    const btn = $('#bk-submit');
    setBusy(btn, true, '登録中…');
    try {
      let order = items.length ? Math.max(...items.map(i => i.order ?? 0)) + 1 : 0;
      for (let i = 0; i < rows.length; i += 400) {
        const batch = db.batch();
        for (const r of rows.slice(i, i + 400)) {
          batch.set(db.collection('items').doc(), { ...r, order: order++, published: true, createdAt: FV.serverTimestamp() });
        }
        await batch.commit();
      }
      closeModal();
      await reloadItems();
      renderItems(); renderPending(); renderEmployees();
      toast(`${rows.length} 件を登録しました`, 'ok');
    } catch (err) {
      $('#bk-error').textContent = authErrorMessage(err);
      setBusy(btn, false);
    }
  });
}

/* ================= 設定 ================= */
function renderTemplate() {
  const wrap = $('#tpl-list');
  wrap.innerHTML = tplDraft.length ? tplDraft.map((label, i) => `<div class="row">
    <div class="order-btns"><button type="button" data-tmove="${i}" data-dir="-1">▲</button><button type="button" data-tmove="${i}" data-dir="1">▼</button></div>
    <input class="row-main" data-tidx="${i}" value="${esc(label)}" style="margin:0">
    <button type="button" class="btn btn-ghost btn-sm" data-tdel="${i}">✕</button>
  </div>`).join('') : '<p class="muted small">まだチェック項目はありません</p>';
}

function readTplInputs() {
  $$('#tpl-list input[data-tidx]').forEach(inp => { tplDraft[Number(inp.dataset.tidx)] = inp.value; });
}

function addTplRow() {
  const inp = $('#tpl-new');
  const v = inp.value.trim();
  if (!v) return;
  readTplInputs();
  tplDraft.push(v);
  inp.value = '';
  renderTemplate();
}

function onTplClick(e) {
  const del = e.target.closest('[data-tdel]');
  if (del) { readTplInputs(); tplDraft.splice(Number(del.dataset.tdel), 1); renderTemplate(); return; }
  const mv = e.target.closest('[data-tmove]');
  if (mv) {
    readTplInputs();
    const i = Number(mv.dataset.tmove), j = i + Number(mv.dataset.dir);
    if (j < 0 || j >= tplDraft.length) return;
    [tplDraft[i], tplDraft[j]] = [tplDraft[j], tplDraft[i]];
    renderTemplate();
  }
}

async function saveTemplate() {
  readTplInputs();
  const list = tplDraft.map(s => s.trim()).filter(Boolean);
  const btn = $('#tpl-save');
  setBusy(btn, true, '保存中…');
  try {
    await db.doc('settings/reportTemplate').set({ items: list, updatedAt: FV.serverTimestamp() });
    template = list; tplDraft = [...list];
    renderTemplate();
    toast('チェック項目を保存しました', 'ok');
  } catch (err) {
    toast(authErrorMessage(err), 'err');
  } finally {
    setBusy(btn, false);
  }
}

function renderAdmins() {
  $('#admin-count').textContent = `${admins.length} / ${MAX_ADMINS}`;
  $('#admin-list').innerHTML = admins.map(a => `<div class="row">
    <div class="row-main"><b>${esc(a.name || '')}</b>${a.email === me.email ? ' <span class="badge badge-type">自分</span>' : ''}<div class="muted small">${esc(a.email)}</div></div>
    ${a.email === me.email ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-remove-admin="${esc(a.email)}">外す</button>`}
  </div>`).join('');
  $('#btn-add-admin').hidden = admins.length >= MAX_ADMINS;
}

function openAddAdmin() {
  openModal(`<h3>責任者を追加</h3>
    <form id="admin-form">
      <label>名前（表示名）<input id="af-name" required placeholder="例：佐藤"></label>
      <label>メールアドレス（ログインID）<input id="af-email" type="email" required inputmode="email" autocapitalize="off" autocomplete="off"></label>
      <label>パスワード（6文字以上）<input id="af-pw" type="text" minlength="6" autocomplete="off" autocapitalize="off"></label>
      <p class="muted small">すでにこのメールでログインアカウントがある場合は、パスワードを空にすると責任者権限だけ付けられます</p>
      <p id="af-error" class="error"></p>
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" id="af-cancel">キャンセル</button>
        <button type="submit" class="btn btn-primary" id="af-submit">追加する</button>
      </div>
    </form>`);
  $('#af-cancel').addEventListener('click', closeModal);
  $('#admin-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#af-name').value.trim();
    const email = $('#af-email').value.trim().toLowerCase();
    const pw = $('#af-pw').value;
    const errEl = $('#af-error');
    errEl.textContent = '';
    if (admins.length >= MAX_ADMINS) { errEl.textContent = `責任者は ${MAX_ADMINS} 人までです`; return; }
    if (admins.some(a => a.email === email)) { errEl.textContent = 'すでに責任者として登録されています'; return; }
    const btn = $('#af-submit');
    setBusy(btn, true, '追加中…');
    try {
      if (pw) await createAuthUser(email, pw);
      await db.doc('admins/' + email).set({ name, createdAt: FV.serverTimestamp() });
      admins.push({ email, name });
      renderAdmins();
      if (pw) showCreated('責任者を追加しました', name, email, pw);
      else { closeModal(); toast('責任者権限を付けました', 'ok'); }
    } catch (err) {
      errEl.textContent = authErrorMessage(err);
      setBusy(btn, false);
    }
  });
}

async function onAdminListClick(e) {
  const btn = e.target.closest('[data-remove-admin]');
  if (!btn) return;
  const email = btn.dataset.removeAdmin;
  if (!confirm(`${email} を責任者から外しますか？（ログインアカウント自体は残ります）`)) return;
  try {
    await db.doc('admins/' + email).delete();
    admins = admins.filter(a => a.email !== email);
    renderAdmins();
    toast('責任者から外しました');
  } catch (err) { toast(authErrorMessage(err), 'err'); }
}

async function editMyName() {
  const name = prompt('表示名', me.name);
  if (!name || name.trim() === me.name) return;
  try {
    await db.doc('admins/' + me.email).update({ name: name.trim() });
    me.name = name.trim();
    $('#me-name').textContent = me.name;
    $('#my-name-disp').textContent = me.name;
    const a = admins.find(x => x.email === me.email); if (a) a.name = me.name;
    renderAdmins();
    toast('表示名を変更しました', 'ok');
  } catch (err) { toast(authErrorMessage(err), 'err'); }
}
