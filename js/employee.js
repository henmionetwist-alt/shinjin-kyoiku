/* ===== 社員側 ===== */

let me = null;
let items = [], done = {}, approvals = {}, template = [], myReports = [];
let trainingFilter = 'all';
let typeFilter = 'all';
let selectedPhase = null;
const openItems = new Set();

document.addEventListener('DOMContentLoaded', () => {
  applyAppName('');
  bindLoginForm();
  $('#blocked-logout').addEventListener('click', () => auth.signOut());
  $('#btn-logout').addEventListener('click', () => { if (confirm('ログアウトしますか？')) auth.signOut(); });
  $$('.tabbar button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
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
  bindRefresh(refreshAll);
  auth.onAuthStateChanged(onAuth);
});

/* 最新の状態に更新（入力中の日報は消さない） */
async function refreshAll(btn) {
  if (!me || (btn && btn.disabled)) return;
  setBusy(btn, true, '更新中…');
  const before = JSON.stringify(template);
  try {
    await loadAll();
    renderHome(); renderTraining(); renderHistory();
    if (JSON.stringify(template) !== before) renderReportForm();
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
  const [it, prog, appr, tpl, reps] = await Promise.all([
    fetchItems(true),
    db.doc('progress/' + me.uid).get(),
    db.doc('approvals/' + me.uid).get(),
    fetchTemplate(),
    db.collection('reports').where('uid', '==', me.uid).get(),
  ]);
  items = it;
  done = prog.exists ? (prog.data().done || {}) : {};
  approvals = appr.exists ? (appr.data().items || {}) : {};
  template = tpl;
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
}

/* ---- ホーム ---- */
function renderHome() {
  $('#home-greet').textContent = `${me.name} さん`;
  const s = progressSummary(items, done, approvals);
  const pct = s.total ? Math.round(s.approved / s.total * 100) : 0;
  $('#home-approved').textContent = s.approved;
  $('#home-total').textContent = s.total;
  $('#home-bar').style.width = pct + '%';
  const phases = groupByPhase(items);
  const cur = currentPhase(items, done, approvals);
  $('#home-phases').innerHTML = phases.map(p => {
    const ps = progressSummary(p.items, done, approvals);
    return `<div class="phase-row ${p.name === cur ? 'current' : ''}" data-phase="${esc(p.name)}">
      <div class="phase-head"><b>${esc(p.name)}</b><span class="muted small">${ps.approved} / ${ps.total}${ps.pending ? `（確認待ち ${ps.pending}）` : ''}</span></div>
      ${stampGrid(p.items, done, approvals)}
    </div>`;
  }).join('');
  const next = items.find(i => statusOf(i.id, done, approvals) === 'none');
  let msg;
  if (!s.total) msg = '教育項目はまだ登録されていません';
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
  const phases = groupByPhase(items);
  if (selectedPhase !== '*' && !phases.some(p => p.name === selectedPhase)) selectedPhase = currentPhase(items, done, approvals);
  $('#phase-chips').innerHTML = phases.length > 1
    ? `<button class="chip ${selectedPhase === '*' ? 'active' : ''}" data-phase="*">すべて</button>` +
      phases.map(p => `<button class="chip ${p.name === selectedPhase ? 'active' : ''}" data-phase="${esc(p.name)}">${esc(p.name)}</button>`).join('')
    : '';
  const phase = phases.find(p => p.name === selectedPhase);
  const base = (selectedPhase !== '*' && phase) ? phase.items : items;
  renderTypeSeg($('#type-seg'), base, typeFilter);
  const matchType = i => typeFilter === 'all' || (i.type || 'check') === typeFilter;
  const list = base.filter(i => matchType(i)
    && (trainingFilter === 'all' || statusOf(i.id, done, approvals) === trainingFilter));
  if (!list.length) {
    let msg = items.length ? '該当する項目はありません' : '教育項目はまだ登録されていません';
    if (items.length && typeFilter !== 'all' && selectedPhase !== '*') {
      const others = phases.filter(p => p.name !== selectedPhase && p.items.some(matchType));
      if (others.length) {
        msg += `<br><span class="small">${TYPE_LABELS[typeFilter]}は別の段階にあります：` +
          others.map(p => `<button class="chip" data-phase="${esc(p.name)}">${esc(p.name)} ${p.items.filter(matchType).length}</button>`).join(' ') + '</span>';
      }
    }
    wrap.innerHTML = `<p class="empty">${msg}</p>`;
    return;
  }
  const showPhaseTitles = selectedPhase === '*' && phases.length > 1;
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
  return `<div class="item item-${st} ${isOpen ? 'open' : ''}" data-item="${it.id}">
    <div class="item-head" data-toggle>
      <span class="badge badge-${st}">${STATUS_LABELS[st]}</span>
      <span class="item-title">${esc(it.title)}</span>
      ${quick}
    </div>
    <div class="item-body" ${isOpen ? '' : 'hidden'}>
      ${it.type === 'video' && it.videoUrl ? `<a class="btn btn-video" href="${esc(it.videoUrl)}" target="_blank" rel="noopener">▶ ビデオを見る</a>` : ''}
      ${it.description ? `<p class="item-desc">${nl2br(it.description)}</p>` : ''}
      <div class="item-actions">${actions}</div>
    </div>
  </div>`;
}

function onTrainingClick(e) {
  const doneBtn = e.target.closest('[data-done]');
  if (doneBtn) { markDone(doneBtn.dataset.done, doneBtn); return; }
  const undoBtn = e.target.closest('[data-undo]');
  if (undoBtn) { undoDone(undoBtn.dataset.undo, undoBtn); return; }
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
  $('#report-checks').innerHTML = template.length
    ? template.map((label, i) => `<label class="check"><input type="checkbox" data-idx="${i}"><span>${esc(label)}</span></label>`).join('')
    : '<p class="hint">チェック項目はまだ設定されていません。内容だけ書いて提出できます</p>';
}

async function submitReport(e) {
  e.preventDefault();
  const date = $('#report-date').value;
  const text = $('#report-text').value.trim();
  const checks = template.map((label, i) => ({ label, done: !!$(`#report-checks input[data-idx="${i}"]`)?.checked }));
  if (!date) { toast('日付を入れてください', 'err'); return; }
  if (!text && !checks.some(c => c.done)) { toast('チェックを付けるか、内容を書いてください', 'err'); return; }
  const existing = myReports.find(r => r.date === date);
  if (existing && !confirm(`${fmtYmd(date)} の日報はすでに提出しています。内容を書き換えますか？`)) return;

  const btn = $('#report-submit');
  setBusy(btn, true, '送信中…');
  try {
    if (existing) {
      await db.doc('reports/' + existing.id).update({ checks, text, updatedAt: FV.serverTimestamp() });
    } else {
      await db.collection('reports').add({
        uid: me.uid, name: me.name, date, checks, text,
        confirmations: {}, createdAt: FV.serverTimestamp(),
      });
    }
    toast('日報を提出しました', 'ok');
    $('#report-text').value = '';
    $$('#report-checks input').forEach(c => { c.checked = false; });
    $('#report-date').value = todayStr();
    setReports(await db.collection('reports').where('uid', '==', me.uid).get());
    renderHistory(); renderHome();
  } catch (err) {
    toast(authErrorMessage(err), 'err');
  } finally {
    setBusy(btn, false);
  }
}

function renderHistory() {
  const wrap = $('#report-history');
  if (!myReports.length) { wrap.innerHTML = '<p class="empty">まだ提出した日報はありません</p>'; return; }
  wrap.innerHTML = myReports.slice(0, 60).map(r => {
    const conf = Object.values(r.confirmations || {});
    const checks = r.checks || [];
    const doneN = checks.filter(c => c.done).length;
    return `<div class="card">
      <div class="report-head"><span class="date">${fmtYmd(r.date)}</span>${checks.length ? `<span class="right">チェック ${doneN}/${checks.length}</span>` : ''}</div>
      ${checks.length ? `<ul class="check-list">${checks.map(c => `<li class="${c.done ? 'on' : ''}">${c.done ? '☑' : '☐'} ${esc(c.label)}</li>`).join('')}</ul>` : ''}
      ${r.text ? `<p class="report-text">${esc(r.text)}</p>` : ''}
      <div class="confirms">${conf.length ? conf.map(c => `<span class="chip-ok">✅ ${esc(c.name)}</span>`).join('') : '<span class="muted">責任者の確認待ち</span>'}</div>
    </div>`;
  }).join('');
}
