/* ===== 共通処理（社員側・責任者側で共有） ===== */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const FV = firebase.firestore.FieldValue;

const TYPE_LABELS = { check: 'チェック', text: '説明あり', video: 'ビデオ' };
const STATUS_LABELS = { none: '未着手', pending: '確認待ち', approved: '承認済み' };
const MAX_ADMINS = 5;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

/* ---- 日付 ---- */
function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  return null;
}
const pad2 = n => String(n).padStart(2, '0');
function fmtDateTime(v) {
  const d = toDate(v); if (!d) return '';
  return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
function fmtYmd(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${WEEK[dt.getDay()]})`;
}

/* ---- 画面まわり ---- */
let toastTimer;
function toast(msg, type = '') {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 2800);
}

function showView(id) {
  $$('.view').forEach(v => { v.hidden = (v.id !== id); });
  window.scrollTo(0, 0);
}

function setTab(name) {
  $$('.tab-panel').forEach(p => { p.hidden = (p.dataset.tab !== name); });
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  window.scrollTo(0, 0);
}

function setBusy(btn, busy, label) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.textContent = label || '処理中…';
    btn.disabled = true;
  } else {
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
    btn.disabled = false;
  }
}

function applyAppName(suffix) {
  const name = (typeof APP_NAME === 'string' && APP_NAME) ? APP_NAME : '新人教育';
  const full = suffix ? `${name} ${suffix}` : name;
  $$('.app-name').forEach(el => { el.textContent = name; });
  document.title = full;
  const meta = $('meta[name="apple-mobile-web-app-title"]');
  if (meta) meta.content = full;
}

function authErrorMessage(err) {
  const code = (err && err.code) || '';
  const map = {
    'auth/invalid-email': 'メールアドレスの形式が正しくありません',
    'auth/user-disabled': 'このアカウントは無効化されています',
    'auth/user-not-found': 'メールアドレスまたはパスワードが違います',
    'auth/wrong-password': 'メールアドレスまたはパスワードが違います',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが違います',
    'auth/invalid-login-credentials': 'メールアドレスまたはパスワードが違います',
    'auth/missing-password': 'パスワードを入力してください',
    'auth/too-many-requests': '試行回数が多すぎます。しばらくしてからお試しください',
    'auth/email-already-in-use': 'このメールアドレスはすでに登録されています',
    'auth/weak-password': 'パスワードは6文字以上にしてください',
    'auth/network-request-failed': '通信エラーです。電波状況を確認してください',
    'auth/unauthorized-domain': 'このサイトのドメインが Firebase で承認されていません（Authentication → 設定 → 承認済みドメイン に追加してください）',
    'auth/operation-not-allowed': 'Firebase でメール／パスワードのログインが有効になっていません',
    'permission-denied': 'この操作の権限がありません（Firestore のルールとアカウント登録を確認してください）',
    'unavailable': '通信できませんでした。電波状況を確認してください',
  };
  if (map[code]) return map[code];
  if (err && /api-key|apiKey|invalid-api-key/i.test(err.message || '')) return 'firebase-config.js の設定が貼り付けられていません';
  return (err && err.message) || '不明なエラーが起きました';
}

/* ---- Firestore 共通 ---- */
async function fetchItems(publishedOnly) {
  const snap = await db.collection('items').get();
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (publishedOnly) items = items.filter(i => i.published !== false);
  items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return items;
}

function phaseName(it) { return (it.phase || '').trim() || '全般'; }

/* 段階 → カテゴリ の2段でまとめる */
function groupByPhase(items) {
  const phases = []; const idx = {};
  for (const it of items) {
    const p = phaseName(it);
    if (!(p in idx)) { idx[p] = phases.length; phases.push({ name: p, items: [] }); }
    phases[idx[p]].items.push(it);
  }
  phases.forEach(p => { p.groups = groupItems(p.items); });
  return phases;
}

/* いま取り組む段階（未承認が残っている最初の段階） */
function currentPhase(items, done, approvals) {
  const phases = groupByPhase(items);
  const cur = phases.find(p => p.items.some(i => statusOf(i.id, done, approvals) !== 'approved'));
  return (cur || phases[phases.length - 1] || { name: '' }).name;
}

function groupItems(items) {
  const groups = []; const idx = {};
  for (const it of items) {
    const g = (it.group || '').trim() || 'その他';
    if (!(g in idx)) { idx[g] = groups.length; groups.push({ name: g, items: [] }); }
    groups[idx[g]].items.push(it);
  }
  return groups;
}

/* アプリ設定（settings/app）: phaseLock = 段階の許可制 */
async function fetchAppSettings() {
  const snap = await db.doc('settings/app').get();
  return Object.assign({ phaseLock: false }, snap.exists ? snap.data() : {});
}
/* 段階が社員に開放されているか */
function isPhaseUnlocked(name, unlocked, phaseLock) {
  return !phaseLock || !!(unlocked && unlocked[name]);
}
/* 開放済みの段階の項目だけに絞る */
function unlockedItems(items, unlocked, phaseLock) {
  if (!phaseLock) return items;
  return items.filter(i => isPhaseUnlocked(phaseName(i), unlocked, phaseLock));
}

/* タイピングの言葉リスト（settings/practice）。初期リストと責任者の追加分を合わせて返す */
async function fetchPracticeWords() {
  const snap = await db.doc('settings/practice').get();
  const data = snap.exists ? snap.data() : {};
  const custom = (data.words || []).map(w => ({ display: w.display || w.kana, kana: w.kana })).filter(w => w.kana);
  const base = data.useDefault === false ? [] : DEFAULT_TYPING_WORDS.map(([display, kana]) => ({ display, kana }));
  const pass = Object.assign({ typingCpm: 0, typingAcc: 0, shortcutScore: 0 }, data.pass || {});
  return { words: [...base, ...custom], useDefault: data.useDefault !== false, custom, pass };
}
/* 合格ラインを満たした記録があるか */
function practicePassed(kind, rec, pass) {
  if (!rec || !pass) return false;
  const hist = [...(rec.history || [])];
  if (rec.best) hist.push(rec.best);
  if (kind === 'typing') {
    if (!pass.typingCpm && !pass.typingAcc) return false;
    return hist.some(h => (h.cpm || 0) >= (pass.typingCpm || 0) && (h.acc || 0) >= (pass.typingAcc || 0));
  }
  if (!pass.shortcutScore) return false;
  return hist.some(h => (h.score || 0) >= pass.shortcutScore);
}
function passLineText(kind, pass) {
  if (!pass) return '';
  if (kind === 'typing') {
    const parts = [];
    if (pass.typingCpm) parts.push(`${pass.typingCpm} 打鍵/分`);
    if (pass.typingAcc) parts.push(`正確率 ${pass.typingAcc}%`);
    return parts.join('・');
  }
  return pass.shortcutScore ? `${pass.shortcutScore} / ${SHORTCUT_QUESTIONS_TOTAL} 問正解` : '';
}
const SHORTCUT_QUESTIONS_TOTAL = 10;

async function fetchTemplate() {
  const snap = await db.doc('settings/reportTemplate').get();
  return snap.exists ? (snap.data().items || []) : [];
}

function statusOf(itemId, done, approvals) {
  if (approvals && approvals[itemId]) return 'approved';
  if (done && done[itemId]) return 'pending';
  return 'none';
}

function progressSummary(items, done, approvals) {
  let approved = 0, pending = 0;
  for (const it of items) {
    const s = statusOf(it.id, done, approvals);
    if (s === 'approved') approved++; else if (s === 'pending') pending++;
  }
  return { total: items.length, approved, pending, none: items.length - approved - pending };
}

/* 進捗をマス目で表示（1項目＝1マス） */
function stampGrid(items, done, approvals) {
  if (!items.length) return '';
  return `<div class="stamps">${items.map(i => {
    const s = statusOf(i.id, done, approvals);
    return `<span class="stamp stamp-${s}" title="${esc(i.title)}"></span>`;
  }).join('')}</div>`;
}

/* 分類タブ（すべて／チェック／説明あり／ビデオ）に件数を付けて描画 */
function renderTypeSeg(el, list, active) {
  if (!el) return;
  const count = t => t === 'all' ? list.length : list.filter(i => (i.type || 'check') === t).length;
  el.innerHTML = [['all', 'すべて'], ['check', 'チェック'], ['text', '説明あり'], ['video', 'ビデオ']]
    .map(([t, label]) => `<button data-type="${t}" class="${t === active ? 'active' : ''}">${label}<small>${count(t)}</small></button>`).join('');
}

/* アプリのバージョン（version.json と index.html / admin.html の ?v= と同じ番号にする） */
const APP_VERSION = '15';

/* 新しいバージョンが公開されていれば読み込み直す。true を返したら reload 済み */
async function checkForNewVersion(showToast) {
  try {
    const res = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.version || data.version === APP_VERSION) return false;
    const key = 'reloadedFor_' + data.version;
    let already = null;
    try { already = sessionStorage.getItem(key); } catch (e) {}
    if (already) {
      // 直前に読み込み直したのに古いまま＝ブラウザの記憶が残っている
      if (showToast) toast('新しいバージョンがありますが、まだ古い画面が残っています。ページを再読み込みしてください', 'err');
      return false;
    }
    try { sessionStorage.setItem(key, '1'); } catch (e) {}
    if (showToast) toast('新しいバージョンに切り替えます…', 'ok');
    setTimeout(() => location.reload(), showToast ? 600 : 0);
    return true;
  } catch (e) {
    return false;
  }
}

/* 「最新の状態に更新」共通：ボタン表示と更新時刻 */
let lastLoadedAt = 0;
function markLoaded() {
  lastLoadedAt = Date.now();
  const el = $('#updated-at');
  if (el) el.textContent = `最終更新 ${fmtDateTime(lastLoadedAt)}`;
}
function bindRefresh(refreshFn) {
  const btn = $('#btn-refresh');
  if (btn) btn.addEventListener('click', () => refreshFn(btn));
  // アプリを開き直したとき（別アプリから戻ったとき等）は自動で更新
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && lastLoadedAt && Date.now() - lastLoadedAt > 60 * 1000) refreshFn(btn);
  });
}

/* ---- モーダル ---- */
function openModal(html) {
  closeModal();
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.id = 'modal';
  bd.innerHTML = `<div class="modal">${html}</div>`;
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(); });
  document.body.appendChild(bd);
  document.body.classList.add('modal-open');
  return bd;
}
function closeModal() {
  const m = $('#modal');
  if (m) m.remove();
  document.body.classList.remove('modal-open');
}

/* ---- ログイン画面（両画面共通） ---- */
function bindLoginForm() {
  const form = $('#login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const pw = $('#login-password').value;
    const btn = $('#login-btn');
    const errEl = $('#login-error');
    errEl.textContent = '';
    setBusy(btn, true, 'ログイン中…');
    try {
      await auth.signInWithEmailAndPassword(email, pw);
    } catch (err) {
      errEl.textContent = authErrorMessage(err);
    } finally {
      setBusy(btn, false);
    }
  });
  $('#login-reset').addEventListener('click', async e => {
    e.preventDefault();
    const email = ($('#login-email').value || '').trim() || prompt('登録しているメールアドレスを入力してください');
    if (!email) return;
    try {
      await auth.sendPasswordResetEmail(email);
      toast('パスワード再設定メールを送りました', 'ok');
    } catch (err) {
      toast(authErrorMessage(err), 'err');
    }
  });
}

/* 別アカウントを作成する（管理者のログインを維持したまま） */
async function createAuthUser(email, password) {
  let app2;
  try { app2 = firebase.app('secondary'); }
  catch (e) { app2 = firebase.initializeApp(firebaseConfig, 'secondary'); }
  const auth2 = app2.auth();
  await auth2.setPersistence(firebase.auth.Auth.Persistence.NONE);
  const cred = await auth2.createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;
  await auth2.signOut();
  return uid;
}
