/* ===== 練習（タイピング・ショートカット）社員側 ===== */

const TYPING_SECONDS = 60;
const SHORTCUT_QUESTIONS = 10;
let practiceSession = null;   // 進行中の練習
let practiceWords = [];       // [{display, kana}]

/* ---------- ローマ字判定エンジン ---------- */
function romajiCandidates(kana, i) {
  const out = [];
  const add = (len, opts) => opts.forEach(r => out.push({ r, len }));
  const one = kana[i], two = kana.slice(i, i + 2);
  if (one === 'っ' && i + 1 < kana.length) {
    romajiCandidates(kana, i + 1).forEach(c => {
      const ch = c.r[0];
      if (/[bcdfghjklmpqrstvwxyz]/.test(ch) && ch !== 'n') out.push({ r: ch + c.r, len: 1 + c.len });
    });
    add(1, ROMAJI['っ']);
    return out;
  }
  if (two.length === 2 && ROMAJI[two]) add(2, ROMAJI[two]);
  if (one === 'ん') {
    const nxt = kana[i + 1];
    const nextOpts = nxt ? (ROMAJI[kana.slice(i + 1, i + 3)] || ROMAJI[nxt] || []) : [];
    const nAllowed = !!nxt && nextOpts.length > 0 && nextOpts.every(o => /^[bcdfghjklmpqrstvwxz]/.test(o));
    add(1, ['nn', 'xn']);
    if (nAllowed) add(1, ['n']);
  } else if (ROMAJI[one]) {
    add(1, ROMAJI[one]);
  }
  return out;
}
function canonicalRomaji(kana, from) {
  let s = '', i = from;
  while (i < kana.length) {
    const c = romajiCandidates(kana, i);
    if (!c.length) { i++; continue; }
    // 2文字の組み合わせ（きゃ等）を優先し、それ以外は最初の候補
    const best = c.find(x => x.len === 2) || c[0];
    s += best.r; i += best.len;
  }
  return s;
}

function newTypingWord(state) {
  const pool = practiceWords.filter(w => w !== state.word);
  const w = pool[Math.floor(Math.random() * pool.length)] || practiceWords[0];
  state.word = w;
  state.kana = toHiragana(w.kana);
  state.pos = 0; state.buf = ''; state.typed = ''; state.nPending = false;
  state.cands = romajiCandidates(state.kana, 0);
}

function typingKey(state, ch) {
  // 「ん」を n 1文字で確定した直後の余分な n は吸収する
  if (state.nPending) {
    state.nPending = false;
    if (ch === 'n' && !state.cands.some(c => c.r.startsWith(state.buf + 'n'))) { state.typed += 'n'; return 'ok'; }
  }
  const next = state.buf + ch;
  const matching = state.cands.filter(c => c.r.startsWith(next));
  if (!matching.length) return 'miss';
  const done = matching.find(c => c.r === next);
  if (done) {
    const wasSingleN = done.r === 'n' && state.kana[state.pos] === 'ん';
    state.pos += done.len; state.typed += done.r; state.buf = '';
    if (state.pos >= state.kana.length) return 'word';
    state.cands = romajiCandidates(state.kana, state.pos);
    state.nPending = wasSingleN;
  } else {
    state.buf = next; state.cands = matching;
  }
  return 'ok';
}

/* ---------- 画面 ---------- */
function practiceRecords() { return (practice && practice) || {}; }

function renderPractice() {
  const panel = $('#practice-home');
  if (!panel) return;
  const rec = practiceRecords();
  const tb = rec.typing && rec.typing.best;
  const sb = rec.shortcuts && rec.shortcuts.best;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const setChips = Object.entries(SHORTCUT_SETS).map(([k, s]) => `<label class="chip chip-check"><input type="checkbox" name="sc-set" value="${k}" checked> ${s.name}</label>`).join('');
  panel.innerHTML = `
    ${coarse ? '<div class="hint">練習はキーボードのある PC で行います。スマホでは記録の確認だけできます</div>' : ''}
    <div class="card">
      <h3>⌨️ タイピング練習 <span class="muted small">${TYPING_SECONDS}秒</span></h3>
      <p class="muted small">出てきた言葉をローマ字で打ちます（shi / si、tsu / tu など、どの打ち方でもOK）。日本語入力（IME）はオフにしてください</p>
      <div class="stats">
        <div><b>${tb ? tb.cpm : '－'}</b><span>ベスト 打鍵/分</span></div>
        <div><b>${tb ? tb.acc + '%' : '－'}</b><span>ベスト 正確率</span></div>
        <div><b>${rec.typing && rec.typing.history ? rec.typing.history.length : 0}</b><span>回数</span></div>
      </div>
      <button class="btn btn-primary btn-block" id="typing-start" ${practiceWords.length ? '' : 'disabled'}>タイピングを始める</button>
      ${practiceWords.length ? '' : '<p class="muted small">言葉リストがまだありません（責任者が設定できます）</p>'}
      ${historyList(rec.typing && rec.typing.history, h => `${fmtDateTime(h.at)}　${h.cpm} 打鍵/分・正確率 ${h.acc}%・${h.words} 語`)}
    </div>
    <div class="card">
      <h3>⌨️ ショートカット練習 <span class="muted small">${SHORTCUT_QUESTIONS}問</span></h3>
      <p class="muted small">「コピー」と出たら Ctrl + C を実際に押します。2回間違えると答えが表示されます</p>
      <div class="filter-row" style="flex-wrap:wrap">${setChips}</div>
      <div class="stats">
        <div><b>${sb ? sb.score + '/' + sb.total : '－'}</b><span>ベスト 正解</span></div>
        <div><b>${sb ? sb.seconds + '秒' : '－'}</b><span>ベスト タイム</span></div>
        <div><b>${rec.shortcuts && rec.shortcuts.history ? rec.shortcuts.history.length : 0}</b><span>回数</span></div>
      </div>
      <div class="btn-row"><button class="btn btn-ghost" id="shortcut-learn">一覧を見て覚える</button><button class="btn btn-primary" id="shortcut-start">練習を始める</button></div>
      ${historyList(rec.shortcuts && rec.shortcuts.history, h => `${fmtDateTime(h.at)}　${h.score}/${h.total} 正解・${h.seconds}秒・${esc(h.sets || '')}`)}
    </div>`;
  $('#typing-start').addEventListener('click', startTyping);
  $('#shortcut-start').addEventListener('click', startShortcuts);
  $('#shortcut-learn').addEventListener('click', () => startLearn());
}
function historyList(hist, fmt) {
  if (!hist || !hist.length) return '';
  return `<details class="history"><summary class="muted small">これまでの記録（直近 ${hist.length} 回）</summary><ul class="check-list">${[...hist].reverse().map(h => `<li class="on">${fmt(h)}</li>`).join('')}</ul></details>`;
}

function showSession(html) {
  $('#practice-home').hidden = true;
  const s = $('#practice-session');
  s.hidden = false; s.innerHTML = html;
  window.scrollTo(0, 0);
}
function stopPracticeSession() {
  if (!practiceSession) return;
  clearInterval(practiceSession.timer);
  document.removeEventListener('keydown', practiceSession.onKey, true);
  practiceSession = null;
  const s = $('#practice-session');
  if (s) { s.hidden = true; s.innerHTML = ''; }
  const h = $('#practice-home');
  if (h) h.hidden = false;
}

/* ---------- タイピング ---------- */
function startTyping() {
  stopPracticeSession();
  const state = { kind: 'typing', left: TYPING_SECONDS, started: false, correct: 0, miss: 0, words: 0, timer: null };
  newTypingWord(state);
  showSession(`
    <div class="card practice-card">
      <div class="practice-top"><span id="ty-time" class="practice-time">${TYPING_SECONDS}</span><span class="muted small">秒　<span id="ty-count">0</span> 打鍵・ミス <span id="ty-miss">0</span></span><button class="btn btn-ghost btn-sm" id="ty-quit">やめる</button></div>
      <p class="muted small" id="ty-hint">最初のキーを押すとスタートします（IME はオフに）</p>
      <div class="ty-display" id="ty-display"></div>
      <div class="ty-word" id="ty-word"></div>
      <div class="ty-romaji" id="ty-romaji"></div>
    </div>`);
  $('#ty-quit').addEventListener('click', () => { stopPracticeSession(); renderPractice(); });
  const paint = (flash) => {
    $('#ty-display').textContent = state.word.display;
    $('#ty-word').innerHTML = `<span class="done">${esc(state.kana.slice(0, state.pos))}</span>${esc(state.kana.slice(state.pos))}`;
    const cur = (state.cands.find(c => c.r.startsWith(state.buf)) || { r: state.buf, len: 1 });
    const rest = cur.r.slice(state.buf.length) + canonicalRomaji(state.kana, state.pos + cur.len);
    $('#ty-romaji').innerHTML = `<span class="done">${esc(state.typed)}</span><span class="buf">${esc(state.buf)}</span>${esc(rest)}`;
    $('#ty-count').textContent = state.correct; $('#ty-miss').textContent = state.miss;
    const card = $('.practice-card');
    if (card && flash) { card.classList.remove('flash-ok', 'flash-miss'); void card.offsetWidth; card.classList.add(flash); }
  };
  state.onKey = e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { stopPracticeSession(); renderPractice(); return; }
    if (e.key === 'Process') { $('#ty-hint').textContent = '日本語入力（IME）がオンになっています。半角英数に切り替えてください'; e.preventDefault(); return; }
    if (e.key.length !== 1) return;
    e.preventDefault();
    const ch = e.key.toLowerCase();
    if (!state.started) {
      state.started = true;
      $('#ty-hint').textContent = '';
      state.timer = setInterval(() => {
        state.left--; $('#ty-time').textContent = state.left;
        if (state.left <= 0) finishTyping(state);
      }, 1000);
    }
    const r = typingKey(state, ch);
    if (r === 'miss') { state.miss++; paint('flash-miss'); return; }
    state.correct++;
    if (r === 'word') { state.words++; newTypingWord(state); paint('flash-ok'); return; }
    paint();
  };
  practiceSession = state;
  document.addEventListener('keydown', state.onKey, true);
  paint();
}

async function finishTyping(state) {
  clearInterval(state.timer);
  document.removeEventListener('keydown', state.onKey, true);
  practiceSession = null;
  const acc = state.correct + state.miss ? Math.round(state.correct / (state.correct + state.miss) * 100) : 100;
  const result = { at: Date.now(), cpm: state.correct, acc, words: state.words, miss: state.miss };
  const prev = practiceRecords().typing || {};
  const history = [...(prev.history || []), result].slice(-10);
  const best = !prev.best || result.cpm > prev.best.cpm || (result.cpm === prev.best.cpm && result.acc > prev.best.acc) ? { cpm: result.cpm, acc: result.acc, at: result.at } : prev.best;
  const isBest = best.at === result.at;
  $('#practice-session').innerHTML = `
    <div class="card practice-card">
      <h3>結果 ${isBest ? '🎉 ベスト更新！' : ''}</h3>
      <div class="stats">
        <div><b>${result.cpm}</b><span>打鍵/分</span></div>
        <div><b>${result.acc}%</b><span>正確率</span></div>
        <div><b>${result.words}</b><span>完了した言葉</span></div>
        <div><b>${result.miss}</b><span>ミス</span></div>
      </div>
      <p class="muted small" id="ty-save-status">記録を保存中…</p>
      <div class="btn-row"><button class="btn btn-ghost" id="ty-back">戻る</button><button class="btn btn-primary" id="ty-again">もう一回</button></div>
    </div>`;
  $('#ty-back').addEventListener('click', () => { stopPracticeSession(); $('#practice-session').hidden = true; $('#practice-home').hidden = false; renderPractice(); });
  $('#ty-again').addEventListener('click', startTyping);
  await savePractice('typing', { best, history }, $('#ty-save-status'));
}

/* ---------- ショートカット ---------- */
function normKey(e) {
  const k = (e.key || '').toLowerCase();
  return k === ' ' ? 'space' : k;
}
function shortcutMatches(e, s) {
  const ctrl = !!(e.ctrlKey || e.metaKey);
  if (ctrl !== !!s.ctrl || !!e.shiftKey !== !!s.shift || !!e.altKey !== !!s.alt) return false;
  const k = normKey(e), code = (e.code || '').toLowerCase();
  return s.keys.includes(k) || s.keys.includes(code) || (k === ' ' && s.keys.includes('space'));
}

function startShortcuts() {
  stopPracticeSession();
  const setKeys = $$('input[name="sc-set"]:checked').map(i => i.value);
  if (!setKeys.length) { toast('練習する種類を1つ以上選んでください', 'err'); return; }
  const pool = setKeys.flatMap(k => SHORTCUT_SETS[k].items.map(it => ({ ...it, set: SHORTCUT_SETS[k].name })));
  const qs = [...pool].sort(() => Math.random() - 0.5).slice(0, SHORTCUT_QUESTIONS);
  const state = { kind: 'shortcuts', qs, idx: 0, misses: 0, qMiss: 0, correct: 0, startedAt: null, timer: null, sets: setKeys.map(k => SHORTCUT_SETS[k].name).join('・') };
  showSession(`
    <div class="card practice-card">
      <div class="practice-top"><span class="practice-time" id="sc-time">0</span><span class="muted small">秒　<span id="sc-no">1</span> / ${qs.length} 問・ミス <span id="sc-miss">0</span></span><button class="btn btn-ghost btn-sm" id="sc-quit">やめる</button></div>
      <p class="muted small" id="sc-set"></p>
      <div class="sc-label" id="sc-label"></div>
      <p class="sc-feedback" id="sc-feedback">キーを押してください（最初のキーでタイマー開始）</p>
      <div class="btn-row"><button class="btn btn-ghost btn-sm" id="sc-hint">答えを見る</button><button class="btn btn-ghost btn-sm" id="sc-skip">スキップ</button></div>
    </div>`);
  const paint = () => {
    const q = qs[state.idx];
    $('#sc-no').textContent = state.idx + 1; $('#sc-miss').textContent = state.misses;
    $('#sc-set').textContent = q.set; $('#sc-label').textContent = q.label;
  };
  const advance = (ok) => {
    const prevQ = qs[state.idx];
    const card = $('.practice-card');
    if (card) { card.classList.remove('flash-ok', 'flash-miss'); void card.offsetWidth; card.classList.add(ok ? 'flash-ok' : 'flash-miss'); }
    state.idx++; state.qMiss = 0;
    if (state.idx >= qs.length) { finishShortcuts(state); return; }
    $('#sc-feedback').textContent = ok ? `正解！ ${prevQ.show}：${prevQ.desc || ''}` : '';
    paint();
  };
  $('#sc-quit').addEventListener('click', () => { stopPracticeSession(); renderPractice(); });
  $('#sc-hint').addEventListener('click', () => { const q = qs[state.idx]; $('#sc-feedback').textContent = `答え：${q.show}（${q.desc || ''}）`; });
  $('#sc-skip').addEventListener('click', () => { state.misses++; advance(false); });
  state.onKey = e => {
    if (['control', 'shift', 'alt', 'meta'].includes((e.key || '').toLowerCase())) return;
    if (e.key === 'Escape') { stopPracticeSession(); renderPractice(); return; }
    if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;
    e.preventDefault();
    if (!state.startedAt) {
      state.startedAt = Date.now();
      state.timer = setInterval(() => { $('#sc-time').textContent = Math.floor((Date.now() - state.startedAt) / 1000); }, 250);
    }
    const q = qs[state.idx];
    if (shortcutMatches(e, q)) { state.correct++; advance(true); return; }
    state.misses++; state.qMiss++;
    $('#sc-miss').textContent = state.misses;
    $('#sc-feedback').textContent = state.qMiss >= 2 ? `✕ 答え：${q.show}（${q.desc || ''}）` : '✕ もう一度';
    const card = $('.practice-card');
    if (card) { card.classList.remove('flash-ok', 'flash-miss'); void card.offsetWidth; card.classList.add('flash-miss'); }
  };
  practiceSession = state;
  document.addEventListener('keydown', state.onKey, true);
  paint();
}

async function finishShortcuts(state) {
  clearInterval(state.timer);
  document.removeEventListener('keydown', state.onKey, true);
  practiceSession = null;
  const seconds = state.startedAt ? Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
  const result = { at: Date.now(), score: state.correct, total: state.qs.length, misses: state.misses, seconds, sets: state.sets };
  const prev = practiceRecords().shortcuts || {};
  const history = [...(prev.history || []), result].slice(-10);
  const better = !prev.best || result.score > prev.best.score || (result.score === prev.best.score && result.seconds < prev.best.seconds);
  const best = better ? { score: result.score, total: result.total, seconds: result.seconds, at: result.at } : prev.best;
  $('#practice-session').innerHTML = `
    <div class="card practice-card">
      <h3>結果 ${better ? '🎉 ベスト更新！' : ''}</h3>
      <div class="stats">
        <div><b>${result.score}/${result.total}</b><span>正解</span></div>
        <div><b>${result.seconds}秒</b><span>タイム</span></div>
        <div><b>${result.misses}</b><span>ミス</span></div>
      </div>
      <p class="muted small" id="sc-save-status">記録を保存中…</p>
      <div class="btn-row"><button class="btn btn-ghost" id="sc-back">戻る</button><button class="btn btn-primary" id="sc-again">もう一回</button></div>
    </div>`;
  $('#sc-back').addEventListener('click', () => { stopPracticeSession(); $('#practice-session').hidden = true; $('#practice-home').hidden = false; renderPractice(); });
  $('#sc-again').addEventListener('click', () => { $('#practice-session').hidden = true; $('#practice-home').hidden = false; renderPractice(); startShortcuts(); });
  await savePractice('shortcuts', { best, history }, $('#sc-save-status'));
}

/* ---------- 保存 ---------- */
async function savePractice(kind, data, statusEl) {
  try {
    await db.doc('progress/' + me.uid).set({ practice: { [kind]: data } }, { merge: true });
    practice = { ...(practice || {}), [kind]: data };
    if (statusEl) statusEl.textContent = '記録を保存しました';
  } catch (err) {
    if (statusEl) statusEl.textContent = '保存できませんでした：' + authErrorMessage(err);
  }
}


/* ==================== 覚える（一覧＋試せる場所） ==================== */
let learnSet = 'windows';

function startLearn(setKey) {
  stopPracticeSession();
  if (setKey) learnSet = setKey;
  if (!SHORTCUT_SETS[learnSet]) learnSet = Object.keys(SHORTCUT_SETS)[0];
  const set = SHORTCUT_SETS[learnSet];
  const chips = Object.entries(SHORTCUT_SETS).map(([k, v]) => `<button class="chip ${k === learnSet ? 'active' : ''}" data-learn-set="${k}">${v.name}</button>`).join('');
  const rows = set.items.map(it => `<tr><td class="kbd-cell"><kbd>${esc(it.show)}</kbd></td><td><b>${esc(it.label)}</b><div class="muted small">${esc(it.desc || '')}</div></td></tr>`).join('');
  let sandbox = '';
  if (set.sandbox === 'text') sandbox = `
    <h3 class="section-title">試してみる（文字の練習欄）</h3>
    <div class="card">
      <p class="muted small">下の欄で文字を選んだり、上のキーを押してみてください。押したキーの説明がすぐ下に出ます</p>
      <textarea id="sb-text" rows="6" spellcheck="false">${esc(SANDBOX_TEXT)}</textarea>
      <p class="sb-feedback" id="sb-feedback">キーを押すとここに説明が出ます</p>
      <button class="btn btn-ghost btn-sm" id="sb-reset">サンプル文を元に戻す</button>
    </div>`;
  else if (set.sandbox === 'sheet') sandbox = `
    <h3 class="section-title">試してみる（ミニ表）</h3>
    <div class="card">
      <p class="muted small">セルをクリックして選び、上のキーを押してみてください。矢印で移動、文字を打つと入力、Enter で確定、Delete で消去。押したキーの説明がすぐ下に出ます</p>
      <div id="sb-sheet" class="sb-sheet" tabindex="0"></div>
      <p class="sb-feedback" id="sb-feedback">セルを選んでキーを押すとここに説明が出ます</p>
      <button class="btn btn-ghost btn-sm" id="sb-reset">表を元に戻す</button>
    </div>`;
  else sandbox = `
    <h3 class="section-title">どこが動くか（図）</h3>
    <div class="card">${browserFigure()}<p class="muted small">ブラウザのキーはこの画面では試せないので、実際のブラウザで押してみてください（Ctrl + F は今このページでも試せます）</p></div>`;
  showSession(`
    <div class="practice-top"><b>覚える：ショートカット一覧</b><button class="btn btn-ghost btn-sm" id="learn-back">戻る</button></div>
    <div class="filter-row" style="flex-wrap:wrap">${chips}</div>
    <div class="card"><table class="kbd-table"><tbody>${rows}</tbody></table></div>
    ${sandbox}
    <button class="btn btn-primary btn-block" id="learn-drill">この種類で練習を始める</button>`);
  $('#learn-back').addEventListener('click', () => { stopPracticeSession(); renderPractice(); });
  $$('[data-learn-set]').forEach(b => b.addEventListener('click', () => startLearn(b.dataset.learnSet)));
  $('#learn-drill').addEventListener('click', () => {
    stopPracticeSession(); renderPractice();
    $$('input[name="sc-set"]').forEach(i => { i.checked = i.value === learnSet; });
    startShortcuts();
  });
  practiceSession = { kind: 'learn', onKey: () => {}, timer: null };
  if (set.sandbox === 'text') bindTextSandbox(set);
  if (set.sandbox === 'sheet') bindSheetSandbox(set);
}

function findShortcut(set, e) {
  return set.items.find(it => shortcutMatches(e, it));
}
function sbFeedback(text, ok) {
  const el = $('#sb-feedback');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('ok', !!ok);
}

/* ---- 文字の練習欄 ---- */
function bindTextSandbox(set) {
  const ta = $('#sb-text');
  ta.addEventListener('keydown', e => {
    const it = findShortcut(set, e);
    if (!it) return;
    if (it.block) e.preventDefault();
    sbFeedback(`${it.show}：${it.label} — ${it.note || it.desc || ''}`, true);
  });
  $('#sb-reset').addEventListener('click', () => { ta.value = SANDBOX_TEXT; sbFeedback('サンプル文を元に戻しました'); ta.focus(); });
  ta.focus();
}

/* ---- ミニ表 ---- */
const SB_COLS = 5, SB_ROWS = 7;
function newSheetCells() {
  const cells = Array.from({ length: SB_ROWS }, () => Array.from({ length: SB_COLS }, () => ({ v: '', b: false, u: false, i: false })));
  const seed = [['日付', '担当', '来客数', '売上', 'メモ'], ['9/1', '山田', '12', '34000', ''], ['9/2', '田中', '15', '41000', ''], ['9/3', '山田', '9', '25000', ''], ['9/4', '', '', '', '']];
  seed.forEach((row, r) => row.forEach((v, c) => { cells[r][c].v = v; }));
  cells[0].forEach(c => { c.b = true; });
  return cells;
}
function bindSheetSandbox(set) {
  const box = $('#sb-sheet');
  const sh = { cells: newSheetCells(), cur: { r: 1, c: 1 }, anchor: null, clip: null, undo: [], redo: [], editing: false };
  const colName = c => String.fromCharCode(65 + c);
  const range = () => {
    const a = sh.anchor || sh.cur;
    return { r1: Math.min(a.r, sh.cur.r), r2: Math.max(a.r, sh.cur.r), c1: Math.min(a.c, sh.cur.c), c2: Math.max(a.c, sh.cur.c) };
  };
  const inRange = (r, c) => { const g = range(); return r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2; };
  const snapshot = () => JSON.parse(JSON.stringify(sh.cells));
  const push = () => { sh.undo.push(snapshot()); if (sh.undo.length > 30) sh.undo.shift(); sh.redo = []; };
  const render = () => {
    let h = '<table class="sb-table"><tr><th></th>' + Array.from({ length: SB_COLS }, (_, c) => `<th class="${sh.cur.c === c ? 'hl' : ''}">${colName(c)}</th>`).join('') + '</tr>';
    for (let r = 0; r < SB_ROWS; r++) {
      h += `<tr><th class="${sh.cur.r === r ? 'hl' : ''}">${r + 1}</th>`;
      for (let c = 0; c < SB_COLS; c++) {
        const cell = sh.cells[r][c];
        const cls = ['sb-cell', inRange(r, c) ? 'sel' : '', sh.cur.r === r && sh.cur.c === c ? 'cur' : '', cell.b ? 'b' : '', cell.u ? 'u' : '', cell.i ? 'i' : ''].filter(Boolean).join(' ');
        h += `<td class="${cls}" data-r="${r}" data-c="${c}">${esc(cell.v)}</td>`;
      }
      h += '</tr>';
    }
    box.innerHTML = h + '</table>';
    if (sh.editing) {
      const td = box.querySelector(`td[data-r="${sh.cur.r}"][data-c="${sh.cur.c}"]`);
      td.classList.add('editing');
      td.innerHTML = `<textarea class="sb-edit" rows="1">${esc(sh.editing.text)}</textarea>`;
      const ta = td.querySelector('textarea');
      ta.addEventListener('input', () => { sh.editing.text = ta.value; ta.rows = Math.min(4, ta.value.split('\n').length); });
      ta.addEventListener('keydown', onEditKey);
      ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.rows = Math.min(4, ta.value.split('\n').length);
    }
  };
  const move = (r, c, extend) => {
    r = Math.max(0, Math.min(SB_ROWS - 1, r)); c = Math.max(0, Math.min(SB_COLS - 1, c));
    if (extend) { if (!sh.anchor) sh.anchor = { ...sh.cur }; } else sh.anchor = null;
    sh.cur = { r, c };
  };
  const edgeTarget = (dr, dc) => {
    let { r, c } = sh.cur;
    const val = (rr, cc) => (rr < 0 || rr >= SB_ROWS || cc < 0 || cc >= SB_COLS) ? null : sh.cells[rr][cc].v;
    const here = val(r, c), next = val(r + dr, c + dc);
    if (next === null) return { r, c };
    if (here && next) { while (val(r + dr, c + dc)) { r += dr; c += dc; } return { r, c }; }
    r += dr; c += dc;
    while (val(r, c) === '' && val(r + dr, c + dc) !== null) { r += dr; c += dc; }
    return { r, c };
  };
  const startEdit = (text) => { sh.editing = { text }; render(); };
  const commitEdit = (moveDown) => {
    if (!sh.editing) return;
    push();
    sh.cells[sh.cur.r][sh.cur.c].v = sh.editing.text;
    sh.editing = false;
    if (moveDown) move(sh.cur.r + 1, sh.cur.c);
    render(); box.focus();
  };
  const cancelEdit = () => { sh.editing = false; render(); box.focus(); };
  function onEditKey(e) {
    e.stopPropagation();
    if (e.key === 'Enter' && e.altKey) { e.preventDefault(); sh.editing.text += '\n'; render(); sbFeedback('Alt + Enter：セル内で改行しました', true); return; }
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(true); sbFeedback('Enter：確定して下のセルへ移動'); return; }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); sbFeedback('Esc：編集を取り消しました'); return; }
    if (e.key === 'Tab') { e.preventDefault(); commitEdit(false); move(sh.cur.r, sh.cur.c + 1); render(); return; }
  }
  const setStyle = (key, label) => {
    push();
    const g = range();
    const on = !sh.cells[sh.cur.r][sh.cur.c][key];
    for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) sh.cells[r][c][key] = on;
    sbFeedback(`${label}：${on ? '付けました' : '外しました'}（もう一度押すと戻ります）`, true);
  };
  const fill = (dir) => {
    push();
    let g = range();
    if (sh.anchor === null) {
      if (dir === 'down') { if (sh.cur.r === 0) { sbFeedback('Ctrl + D：上にセルがありません'); return; } g = { r1: sh.cur.r - 1, r2: sh.cur.r, c1: sh.cur.c, c2: sh.cur.c }; }
      else { if (sh.cur.c === 0) { sbFeedback('Ctrl + R：左にセルがありません'); return; } g = { r1: sh.cur.r, r2: sh.cur.r, c1: sh.cur.c - 1, c2: sh.cur.c }; }
    }
    for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) {
      const src = dir === 'down' ? sh.cells[g.r1][c] : sh.cells[r][g.c1];
      Object.assign(sh.cells[r][c], JSON.parse(JSON.stringify(src)));
    }
    sbFeedback(dir === 'down' ? 'Ctrl + D：上のセルの内容を下にコピーしました' : 'Ctrl + R：左のセルの内容を右にコピーしました', true);
  };
  box.addEventListener('keydown', e => {
    if (sh.editing) return;
    const now = new Date();
    const it = findShortcut(set, e);
    const k = normKey(e), ctrl = e.ctrlKey || e.metaKey;
    let handled = true;
    if (ctrl && k === 'z') { const p = sh.undo.pop(); if (p) { sh.redo.push(snapshot()); sh.cells = p; sbFeedback('Ctrl + Z：直前の操作を元に戻しました', true); } else sbFeedback('Ctrl + Z：戻す操作がありません'); }
    else if (ctrl && k === 'y') { const p = sh.redo.pop(); if (p) { sh.undo.push(snapshot()); sh.cells = p; sbFeedback('Ctrl + Y：やり直しました', true); } else sbFeedback('Ctrl + Y：やり直す操作がありません'); }
    else if (ctrl && k === 'b') setStyle('b', 'Ctrl + B 太字');
    else if (ctrl && k === 'u') setStyle('u', 'Ctrl + U 下線');
    else if (ctrl && k === 'i') setStyle('i', 'Ctrl + I 斜体');
    else if (ctrl && k === 'd') fill('down');
    else if (ctrl && k === 'r') fill('right');
    else if (ctrl && e.shiftKey && (k === ';' || k === ':' || e.code === 'Semicolon' || e.code === 'Quote')) { push(); sh.cells[sh.cur.r][sh.cur.c].v = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`; sbFeedback('Ctrl + Shift + ;：現在の時刻を入力しました', true); }
    else if (ctrl && (k === ';' || e.code === 'Semicolon')) { push(); sh.cells[sh.cur.r][sh.cur.c].v = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`; sbFeedback('Ctrl + ;：今日の日付を入力しました', true); }
    else if (ctrl && k === 'space') { sh.anchor = { r: 0, c: sh.cur.c }; sh.cur = { r: SB_ROWS - 1, c: sh.cur.c }; sbFeedback(`Ctrl + Space：${colName(sh.cur.c)} 列を全部選びました`, true); }
    else if (e.shiftKey && !ctrl && k === 'space') { sh.anchor = { r: sh.cur.r, c: 0 }; sh.cur = { r: sh.cur.r, c: SB_COLS - 1 }; sbFeedback(`Shift + Space：${sh.cur.r + 1} 行目を全部選びました`, true); }
    else if (ctrl && k === 'home') { move(0, 0); sbFeedback('Ctrl + Home：A1 に戻りました', true); }
    else if (ctrl && k === 'a') { sh.anchor = { r: 0, c: 0 }; sh.cur = { r: SB_ROWS - 1, c: SB_COLS - 1 }; sbFeedback('Ctrl + A：表を全部選びました', true); }
    else if (ctrl && k === 'c') { const g = range(); sh.clip = { rows: [], cut: false }; for (let r = g.r1; r <= g.r2; r++) sh.clip.rows.push(sh.cells[r].slice(g.c1, g.c2 + 1).map(x => ({ ...x }))); sbFeedback('Ctrl + C：コピーしました（Ctrl + V で貼り付け）', true); }
    else if (ctrl && k === 'x') { push(); const g = range(); sh.clip = { rows: [], cut: true }; for (let r = g.r1; r <= g.r2; r++) { sh.clip.rows.push(sh.cells[r].slice(g.c1, g.c2 + 1).map(x => ({ ...x }))); for (let c = g.c1; c <= g.c2; c++) sh.cells[r][c] = { v: '', b: false, u: false, i: false }; } sbFeedback('Ctrl + X：切り取りました（Ctrl + V で移動先に貼り付け）', true); }
    else if (ctrl && k === 'v') {
      if (!sh.clip) sbFeedback('Ctrl + V：先に Ctrl + C でコピーしてください');
      else { push(); const valuesOnly = e.shiftKey; sh.clip.rows.forEach((row, dr) => row.forEach((src, dc) => { const r = sh.cur.r + dr, c = sh.cur.c + dc; if (r < SB_ROWS && c < SB_COLS) { if (valuesOnly) sh.cells[r][c].v = src.v; else sh.cells[r][c] = { ...src }; } })); sbFeedback(valuesOnly ? 'Ctrl + Shift + V：文字だけ貼り付けました（太字などは付けない）' : 'Ctrl + V：貼り付けました（書式ごと）', true); }
    }
    else if (ctrl && k === 'k') sbFeedback('Ctrl + K：（実際はリンクを入れる画面が開きます）');
    else if (ctrl && k === 'h') sbFeedback('Ctrl + H：（実際は検索と置換の画面が開きます）');
    else if (ctrl && k === 'f') sbFeedback('Ctrl + F：（実際は検索欄が開きます）');
    else if (k.startsWith('arrow')) {
      const dr = k === 'arrowdown' ? 1 : k === 'arrowup' ? -1 : 0, dc = k === 'arrowright' ? 1 : k === 'arrowleft' ? -1 : 0;
      if (ctrl) { const t = edgeTarget(dr, dc); move(t.r, t.c, e.shiftKey); sbFeedback(`${e.shiftKey ? 'Ctrl + Shift + 矢印：端まで選びました' : 'Ctrl + 矢印：データの端まで移動しました'}`, true); }
      else { move(sh.cur.r + dr, sh.cur.c + dc, e.shiftKey); if (e.shiftKey) sbFeedback('Shift + 矢印：選ぶ範囲を広げました', true); }
    }
    else if (k === 'home') { move(sh.cur.r, 0, e.shiftKey); }
    else if (k === 'end') { move(sh.cur.r, SB_COLS - 1, e.shiftKey); }
    else if (k === 'f2') { startEdit(sh.cells[sh.cur.r][sh.cur.c].v); sbFeedback('F2：セルの続きを編集中（Enter で確定）', true); return; }
    else if (k === 'enter') { if (e.altKey) { startEdit(sh.cells[sh.cur.r][sh.cur.c].v + '\n'); sbFeedback('Alt + Enter：セル内で改行しました', true); return; } move(sh.cur.r + 1, sh.cur.c); }
    else if (k === 'tab') { move(sh.cur.r, sh.cur.c + (e.shiftKey ? -1 : 1)); }
    else if (k === 'delete' || k === 'backspace') { push(); const g = range(); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) sh.cells[r][c].v = ''; sbFeedback('Delete：中身を消しました'); }
    else if (k === 'escape') { sh.anchor = null; }
    else if (!ctrl && !e.altKey && e.key.length === 1) { startEdit(e.key); return; }
    else handled = false;
    if (handled) { e.preventDefault(); render(); }
    else if (ctrl || k.startsWith('f')) e.preventDefault();
    if (it && !handled) sbFeedback(`${it.show}：${it.label} — ${it.note || it.desc || ''}`);
  });
  box.addEventListener('mousedown', e => {
    const td = e.target.closest('td[data-r]');
    if (!td) return;
    if (sh.editing) commitEdit(false);
    move(Number(td.dataset.r), Number(td.dataset.c), e.shiftKey);
    render(); box.focus();
    e.preventDefault();
  });
  box.addEventListener('dblclick', e => { const td = e.target.closest('td[data-r]'); if (td) { startEdit(sh.cells[sh.cur.r][sh.cur.c].v); } });
  $('#sb-reset').addEventListener('click', () => { sh.cells = newSheetCells(); sh.undo = []; sh.redo = []; sh.anchor = null; sh.cur = { r: 1, c: 1 }; sh.editing = false; render(); sbFeedback('表を元に戻しました'); box.focus(); });
  render(); box.focus();
}

/* ---- ブラウザの図 ---- */
function browserFigure() {
  return `<svg viewBox="0 0 640 300" class="browser-fig" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="ブラウザ画面の各部分">
    <rect x="1" y="1" width="638" height="298" rx="10" fill="#fff" stroke="#c9d1cc"/>
    <rect x="1" y="1" width="638" height="34" rx="10" fill="#e4e8e5"/>
    <rect x="14" y="8" width="140" height="26" rx="6" fill="#fff" stroke="#c9d1cc"/><text x="26" y="26" font-size="12" fill="#1c2321">開いているページ</text>
    <rect x="160" y="8" width="100" height="26" rx="6" fill="#f4f6f5" stroke="#c9d1cc"/><text x="176" y="26" font-size="12" fill="#6f7a75">別のタブ</text>
    <rect x="1" y="35" width="638" height="40" fill="#f4f6f5"/>
    <text x="16" y="60" font-size="16" fill="#6f7a75">‹ › ↻</text>
    <rect x="80" y="43" width="470" height="24" rx="12" fill="#fff" stroke="#1f6f50" stroke-width="2"/><text x="96" y="60" font-size="12" fill="#6f7a75">https://example.com/</text>
    <text x="560" y="61" font-size="16" fill="#c47a12">★</text><text x="585" y="61" font-size="16" fill="#6f7a75">⋮</text>
    <rect x="1" y="75" width="638" height="12" fill="#e2f0e9"/><text x="10" y="85" font-size="9" fill="#1d6b41">ブックマークバー（Ctrl + D で登録したページが並ぶ）</text>
    <line x1="80" y1="70" x2="80" y2="110" stroke="#1f6f50" stroke-dasharray="3 3"/><rect x="60" y="110" width="215" height="20" rx="4" fill="#1f6f50"/><text x="70" y="124" font-size="12" fill="#fff">Ctrl + L：ここにカーソルが移る</text>
    <line x1="566" y1="68" x2="566" y2="140" stroke="#c47a12" stroke-dasharray="3 3"/><rect x="440" y="140" width="190" height="20" rx="4" fill="#c47a12"/><text x="450" y="154" font-size="12" fill="#fff">Ctrl + D：ブックマークに追加</text>
    <line x1="44" y1="64" x2="44" y2="170" stroke="#2f4c7a" stroke-dasharray="3 3"/><rect x="20" y="170" width="150" height="20" rx="4" fill="#2f4c7a"/><text x="30" y="184" font-size="12" fill="#fff">F5：ページを読み直す</text>
    <rect x="360" y="180" width="270" height="26" rx="6" fill="#fff" stroke="#c9d1cc"/><text x="372" y="197" font-size="12" fill="#6f7a75">🔍 ページ内を検索　1/3　∧ ∨ ✕</text>
    <rect x="360" y="212" width="200" height="20" rx="4" fill="#1c2321"/><text x="370" y="226" font-size="12" fill="#fff">Ctrl + F：この検索欄が右上に出る</text>
    <rect x="20" y="220" width="300" height="20" rx="4" fill="#e4e8e5"/><text x="30" y="234" font-size="12" fill="#1c2321">Ctrl + ＋ / － / 0：ページ全体を拡大・縮小・元に戻す</text>
    <rect x="20" y="250" width="300" height="20" rx="4" fill="#e4e8e5"/><text x="30" y="264" font-size="12" fill="#1c2321">Ctrl + H：履歴　Ctrl + J：ダウンロード（別タブで開く）</text>
    <rect x="20" y="276" width="300" height="20" rx="4" fill="#e4e8e5"/><text x="30" y="290" font-size="12" fill="#1c2321">Space / Shift + Space：1画面ずつ下へ・上へ</text>
  </svg>`;
}
