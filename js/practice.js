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
      <button class="btn btn-primary btn-block" id="shortcut-start">ショートカットを始める</button>
      ${historyList(rec.shortcuts && rec.shortcuts.history, h => `${fmtDateTime(h.at)}　${h.score}/${h.total} 正解・${h.seconds}秒・${esc(h.sets || '')}`)}
    </div>`;
  $('#typing-start').addEventListener('click', startTyping);
  $('#shortcut-start').addEventListener('click', startShortcuts);
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
    const card = $('.practice-card');
    if (card) { card.classList.remove('flash-ok', 'flash-miss'); void card.offsetWidth; card.classList.add(ok ? 'flash-ok' : 'flash-miss'); }
    state.idx++; state.qMiss = 0;
    if (state.idx >= qs.length) { finishShortcuts(state); return; }
    $('#sc-feedback').textContent = ok ? '正解！' : '';
    paint();
  };
  $('#sc-quit').addEventListener('click', () => { stopPracticeSession(); renderPractice(); });
  $('#sc-hint').addEventListener('click', () => { $('#sc-feedback').textContent = '答え：' + qs[state.idx].show; });
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
    $('#sc-feedback').textContent = state.qMiss >= 2 ? `✕ 答え：${q.show}` : '✕ もう一度';
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
