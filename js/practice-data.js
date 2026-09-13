/* ===== 練習用データ（タイピングの言葉・ローマ字表・ショートカット一覧） ===== */

/* 初期の言葉リスト（表示, よみ） */
const DEFAULT_TYPING_WORDS = [
  ['おはようございます', 'おはようございます'], ['ありがとうございました', 'ありがとうございました'],
  ['おつかれさまです', 'おつかれさまです'], ['よろしくお願いします', 'よろしくおねがいします'],
  ['少々お待ちください', 'しょうしょうおまちください'], ['確認します', 'かくにんします'],
  ['失礼します', 'しつれいします'], ['承知しました', 'しょうちしました'], ['お世話になっております', 'おせわになっております'],
  ['報告', 'ほうこく'], ['連絡', 'れんらく'], ['相談', 'そうだん'], ['日報', 'にっぽう'], ['予定', 'よてい'],
  ['会議', 'かいぎ'], ['資料', 'しりょう'], ['準備', 'じゅんび'], ['片付け', 'かたづけ'], ['掃除', 'そうじ'],
  ['電話', 'でんわ'], ['メール', 'めーる'], ['パソコン', 'ぱそこん'], ['キーボード', 'きーぼーど'], ['マウス', 'まうす'],
  ['天気', 'てんき'], ['電車', 'でんしゃ'], ['自転車', 'じてんしゃ'], ['学校', 'がっこう'], ['病院', 'びょういん'],
  ['郵便局', 'ゆうびんきょく'], ['図書館', 'としょかん'], ['公園', 'こうえん'], ['駅前', 'えきまえ'], ['交差点', 'こうさてん'],
  ['りんご', 'りんご'], ['みかん', 'みかん'], ['バナナ', 'ばなな'], ['野菜', 'やさい'], ['お茶', 'おちゃ'], ['コーヒー', 'こーひー'],
  ['朝食', 'ちょうしょく'], ['昼休み', 'ひるやすみ'], ['週末', 'しゅうまつ'], ['来週', 'らいしゅう'], ['今月', 'こんげつ'],
  ['月曜日', 'げつようび'], ['金曜日', 'きんようび'], ['誕生日', 'たんじょうび'], ['新入社員', 'しんにゅうしゃいん'],
  ['責任者', 'せきにんしゃ'], ['お客様', 'おきゃくさま'], ['担当者', 'たんとうしゃ'], ['締め作業', 'しめさぎょう'],
  ['開店準備', 'かいてんじゅんび'], ['送迎', 'そうげい'], ['シフト', 'しふと'], ['チェック', 'ちぇっく'], ['データ', 'でーた'],
  ['今日はいい天気ですね', 'きょうはいいてんきですね'], ['明日の予定を確認する', 'あしたのよていをかくにんする'],
  ['メモを取る癖をつける', 'めもをとるくせをつける'], ['分からないことは聞く', 'わからないことはきく'],
  ['時間を守る', 'じかんをまもる'], ['元気にあいさつする', 'げんきにあいさつする'], ['最後まで話を聞く', 'さいごまではなしをきく'],
  ['三日坊主', 'みっかぼうず'], ['一石二鳥', 'いっせきにちょう'], ['十人十色', 'じゅうにんといろ'],
  ['きっと大丈夫', 'きっとだいじょうぶ'], ['ちょっと待って', 'ちょっとまって'], ['しっかり休む', 'しっかりやすむ'],
];

/* かな → ローマ字（複数の打ち方を許容） */
const ROMAJI = {
  'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu', 'whu'], 'え': ['e'], 'お': ['o'],
  'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
  'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
  'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
  'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
  'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
  'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
  'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
  'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
  'わ': ['wa'], 'ゐ': ['wi'], 'ゑ': ['we'], 'を': ['wo'], 'ん': ['nn', 'xn', 'n'],
  'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
  'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
  'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
  'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
  'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
  'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li', 'xyi', 'lyi'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le', 'xye', 'lye'], 'ぉ': ['xo', 'lo'],
  'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'], 'っ': ['xtu', 'ltu', 'xtsu', 'ltsu'], 'ゎ': ['xwa', 'lwa'],
  'ゔ': ['vu'], 'ー': ['-'], '、': [','], '。': ['.'], '？': ['?'], '！': ['!'], '　': [' '], ' ': [' '],
  'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'], 'きぃ': ['kyi'], 'きぇ': ['kye'],
  'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'], 'しぇ': ['she', 'sye'],
  'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'], 'ちぇ': ['che', 'tye'],
  'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'], 'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
  'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'], 'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
  'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'], 'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'], 'じぇ': ['je', 'zye'],
  'ぢゃ': ['dya'], 'ぢゅ': ['dyu'], 'ぢょ': ['dyo'], 'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'], 'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
  'てぃ': ['thi'], 'でぃ': ['dhi'], 'でゅ': ['dhu'], 'とぅ': ['twu'], 'どぅ': ['dwu'],
  'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'], 'うぃ': ['wi'], 'うぇ': ['we'], 'うぉ': ['who'], 'いぇ': ['ye'],
  'ゔぁ': ['va'], 'ゔぃ': ['vi'], 'ゔぇ': ['ve'], 'ゔぉ': ['vo'], 'くぁ': ['qa'], 'くぃ': ['qi'], 'くぇ': ['qe'], 'くぉ': ['qo'], 'ぐぁ': ['gwa'],
};

/* カタカナ → ひらがな */
function toHiragana(s) {
  return String(s || '').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
}
/* ローマ字に変換できない文字を返す（空なら OK） */
function invalidKanaChars(kana) {
  const bad = [];
  for (const ch of toHiragana(kana)) if (!ROMAJI[ch]) bad.push(ch);
  return [...new Set(bad)];
}

/* ショートカット一覧
   keys  : e.key（小文字）または e.code（小文字）のどれかに一致すれば正解
   desc  : 何が起きるか（1行）
   block : 「覚える」の練習欄で押したとき、ブラウザ側の動きを止める（保存ダイアログ等が開かないように） */
const SHORTCUT_SETS = {
  windows: { name: 'Windows基本', sandbox: 'text', items: [
    { label: 'コピー', ctrl: true, keys: ['c'], show: 'Ctrl + C', desc: '選んでいる文字やファイルを控えておく（貼り付けの準備）' },
    { label: '貼り付け', ctrl: true, keys: ['v'], show: 'Ctrl + V', desc: 'コピー／切り取りしたものを今の場所に出す' },
    { label: '切り取り', ctrl: true, keys: ['x'], show: 'Ctrl + X', desc: '選んでいるものを取り除いて控える（移動に使う）' },
    { label: '元に戻す', ctrl: true, keys: ['z'], show: 'Ctrl + Z', desc: '直前の操作を取り消す。何回でも戻れる' },
    { label: 'やり直し（元に戻すの取り消し）', ctrl: true, keys: ['y'], show: 'Ctrl + Y', desc: '「元に戻す」で戻しすぎたときに1つ進める' },
    { label: 'すべて選択', ctrl: true, keys: ['a'], show: 'Ctrl + A', desc: '文書やフォルダの中身を全部選ぶ' },
    { label: '保存', ctrl: true, keys: ['s'], show: 'Ctrl + S', desc: '今開いているファイルを上書き保存する', block: true, note: 'ここでは保存するものが無いので何も起きません' },
    { label: '検索', ctrl: true, keys: ['f'], show: 'Ctrl + F', desc: '画面の中から文字を探す検索欄を開く', block: true, note: 'ここでは検索欄は開きません' },
    { label: '印刷', ctrl: true, keys: ['p'], show: 'Ctrl + P', desc: '印刷の画面を開く', block: true, note: 'ここでは印刷画面は開きません' },
    { label: '名前の変更', keys: ['f2'], show: 'F2', desc: 'エクスプローラーで選んだファイルの名前を変え始める', note: 'ここではファイルが無いので何も起きません' },
    { label: '文書の先頭へ', ctrl: true, keys: ['home'], show: 'Ctrl + Home', desc: 'カーソルを文書のいちばん最初へ飛ばす' },
    { label: '文書の末尾へ', ctrl: true, keys: ['end'], show: 'Ctrl + End', desc: 'カーソルを文書のいちばん最後へ飛ばす' },
    { label: '前の単語まで選択', ctrl: true, shift: true, keys: ['arrowleft'], show: 'Ctrl + Shift + ←', desc: 'カーソルの左側を単語ごとに選ぶ' },
    { label: '行頭まで選択', shift: true, keys: ['home'], show: 'Shift + Home', desc: 'カーソルから行の先頭までを選ぶ' },
  ] },
  browser: { name: 'ブラウザ操作', sandbox: 'browser', items: [
    { label: 'ページ内を検索', ctrl: true, keys: ['f'], show: 'Ctrl + F', desc: '右上に検索欄が出て、ページの中の文字を探せる' },
    { label: 'アドレスバーへ移動', ctrl: true, keys: ['l'], show: 'Ctrl + L', desc: '上のアドレスバーにカーソルが移る。そのまま URL や検索語を打てる' },
    { label: 'ブックマークに追加', ctrl: true, keys: ['d'], show: 'Ctrl + D', desc: '今のページをブックマーク（お気に入り）に登録する' },
    { label: 'ページを更新', keys: ['f5'], show: 'F5', desc: 'ページを読み込み直す（最新の状態にする）' },
    { label: '履歴を開く', ctrl: true, keys: ['h'], show: 'Ctrl + H', desc: '今まで見たページの一覧を開く' },
    { label: 'ダウンロード一覧', ctrl: true, keys: ['j'], show: 'Ctrl + J', desc: 'ダウンロードしたファイルの一覧を開く' },
    { label: '印刷', ctrl: true, keys: ['p'], show: 'Ctrl + P', desc: 'ページを印刷する画面を開く' },
    { label: '拡大', ctrl: true, keys: ['+', '=', ';', 'equal', 'semicolon', 'numpadadd'], show: 'Ctrl + ＋', desc: 'ページの文字や画像を大きく表示する' },
    { label: '縮小', ctrl: true, keys: ['-', 'minus', 'numpadsubtract'], show: 'Ctrl + －', desc: 'ページを小さく表示する' },
    { label: '拡大率を100%に戻す', ctrl: true, keys: ['0', 'digit0', 'numpad0'], show: 'Ctrl + 0', desc: '拡大・縮小を元の大きさに戻す' },
    { label: 'ページの一番上へ', keys: ['home'], show: 'Home', desc: 'ページの先頭までスクロールする' },
    { label: 'ページの一番下へ', keys: ['end'], show: 'End', desc: 'ページの末尾までスクロールする' },
    { label: '1画面下へスクロール', keys: [' ', 'space'], show: 'Space', desc: '画面1つ分だけ下へ進む（長いページを読むとき）' },
    { label: '1画面上へスクロール', shift: true, keys: [' ', 'space'], show: 'Shift + Space', desc: '画面1つ分だけ上へ戻る' },
  ] },
  sheets: { name: 'スプレッドシート/Excel', sandbox: 'sheet', items: [
    { label: '太字', ctrl: true, keys: ['b'], show: 'Ctrl + B', desc: '選んだセルの文字を太くする（もう一度で戻る）' },
    { label: '下線', ctrl: true, keys: ['u'], show: 'Ctrl + U', desc: '選んだセルの文字に下線を付ける' },
    { label: '斜体', ctrl: true, keys: ['i'], show: 'Ctrl + I', desc: '選んだセルの文字を斜めにする' },
    { label: 'セルを編集', keys: ['f2'], show: 'F2', desc: 'セルの中身を消さずに続きから編集する' },
    { label: 'セル内で改行', alt: true, keys: ['enter'], show: 'Alt + Enter', desc: '編集中のセルの中で改行する（Enter だけだと確定して下に移動）' },
    { label: '今日の日付を入力', ctrl: true, keys: [';', 'semicolon'], show: 'Ctrl + ;', desc: 'セルに今日の日付が入る' },
    { label: '現在の時刻を入力', ctrl: true, shift: true, keys: [';', ':', 'semicolon', 'quote'], show: 'Ctrl + Shift + ;', desc: 'セルに今の時刻が入る' },
    { label: '上のセルをコピー（下方向にフィル）', ctrl: true, keys: ['d'], show: 'Ctrl + D', desc: 'すぐ上のセルの内容を、選んでいるセルにコピーする' },
    { label: '左のセルをコピー（右方向にフィル）', ctrl: true, keys: ['r'], show: 'Ctrl + R', desc: 'すぐ左のセルの内容を、選んでいるセルにコピーする' },
    { label: '列全体を選択', ctrl: true, keys: [' ', 'space'], show: 'Ctrl + Space', desc: '今いる列を丸ごと選ぶ' },
    { label: '行全体を選択', shift: true, keys: [' ', 'space'], show: 'Shift + Space', desc: '今いる行を丸ごと選ぶ' },
    { label: 'データの端まで移動（下）', ctrl: true, keys: ['arrowdown'], show: 'Ctrl + ↓', desc: '入力のある範囲の下端まで一気に飛ぶ（←→↑も同じ）' },
    { label: 'データの端まで選択（下）', ctrl: true, shift: true, keys: ['arrowdown'], show: 'Ctrl + Shift + ↓', desc: '今のセルから下端までを一気に選ぶ' },
    { label: 'A1 セルへ移動', ctrl: true, keys: ['home'], show: 'Ctrl + Home', desc: '表の左上（A1）へ戻る' },
    { label: 'リンクを挿入', ctrl: true, keys: ['k'], show: 'Ctrl + K', desc: 'セルに URL のリンクを付ける画面を開く', note: 'ここではリンクの画面は省略しています' },
    { label: '値のみ貼り付け', ctrl: true, shift: true, keys: ['v'], show: 'Ctrl + Shift + V', desc: '色や太字などの書式は付けず、文字だけを貼り付ける' },
    { label: '検索と置換', ctrl: true, keys: ['h'], show: 'Ctrl + H', desc: '文字を探して別の文字に置き換える画面を開く', note: 'ここでは置換の画面は省略しています' },
  ] },
  ime: { name: '文字入力', sandbox: 'text', items: [
    { label: 'ひらがなに変換', keys: ['f6'], show: 'F6', desc: '入力中（確定前）の文字をひらがなにする' },
    { label: '全角カタカナに変換', keys: ['f7'], show: 'F7', desc: '入力中の文字を全角カタカナにする' },
    { label: '半角カタカナに変換', keys: ['f8'], show: 'F8', desc: '入力中の文字を半角ｶﾀｶﾅにする' },
    { label: '全角英数に変換', keys: ['f9'], show: 'F9', desc: '入力中の文字を全角の英数字（ＡＢＣ）にする' },
    { label: '半角英数に変換', keys: ['f10'], show: 'F10', desc: '入力中の文字を半角の英数字（ABC）にする' },
    { label: '単語ごとに削除（前）', ctrl: true, keys: ['backspace'], show: 'Ctrl + BackSpace', desc: 'カーソルの左側を1文字ずつではなく単語ごとに消す' },
    { label: '行頭へ移動', keys: ['home'], show: 'Home', desc: 'カーソルを今の行の先頭へ' },
    { label: '行末へ移動', keys: ['end'], show: 'End', desc: 'カーソルを今の行の末尾へ' },
    { label: '行頭まで選択', shift: true, keys: ['home'], show: 'Shift + Home', desc: 'カーソルから行の先頭までを選ぶ' },
    { label: '行末まで選択', shift: true, keys: ['end'], show: 'Shift + End', desc: 'カーソルから行の末尾までを選ぶ' },
    { label: '1文字ずつ選択（右）', shift: true, keys: ['arrowright'], show: 'Shift + →', desc: '押すたびに右へ1文字ずつ選ぶ範囲が広がる' },
    { label: '単語ごとに移動（右）', ctrl: true, keys: ['arrowright'], show: 'Ctrl + →', desc: 'カーソルを1文字ずつではなく単語ごとに右へ動かす' },
  ] },
};

/* 「覚える」用のサンプル文（文字の練習欄に最初から入っている） */
const SANDBOX_TEXT = `おはようございます。今日の予定を確認します。
午前：開店準備、掃除、データ取り
午後：お客様対応、日報の記入
分からないことは、責任者に相談してください。
sample text for typing 2026`;
