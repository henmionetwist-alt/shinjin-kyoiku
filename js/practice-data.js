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
   keys は e.key（小文字）または e.code（小文字）のどれかに一致すれば正解 */
const SHORTCUT_SETS = {
  windows: { name: 'Windows基本', items: [
    { label: 'コピー', ctrl: true, keys: ['c'], show: 'Ctrl + C' },
    { label: '貼り付け', ctrl: true, keys: ['v'], show: 'Ctrl + V' },
    { label: '切り取り', ctrl: true, keys: ['x'], show: 'Ctrl + X' },
    { label: '元に戻す', ctrl: true, keys: ['z'], show: 'Ctrl + Z' },
    { label: 'やり直し（元に戻すの取り消し）', ctrl: true, keys: ['y'], show: 'Ctrl + Y' },
    { label: 'すべて選択', ctrl: true, keys: ['a'], show: 'Ctrl + A' },
    { label: '保存', ctrl: true, keys: ['s'], show: 'Ctrl + S' },
    { label: '検索', ctrl: true, keys: ['f'], show: 'Ctrl + F' },
    { label: '印刷', ctrl: true, keys: ['p'], show: 'Ctrl + P' },
    { label: '名前の変更', keys: ['f2'], show: 'F2' },
    { label: '文書の先頭へ', ctrl: true, keys: ['home'], show: 'Ctrl + Home' },
    { label: '文書の末尾へ', ctrl: true, keys: ['end'], show: 'Ctrl + End' },
    { label: '前の単語まで選択', ctrl: true, shift: true, keys: ['arrowleft'], show: 'Ctrl + Shift + ←' },
    { label: '行頭まで選択', shift: true, keys: ['home'], show: 'Shift + Home' },
  ] },
  browser: { name: 'ブラウザ操作', items: [
    { label: 'ページ内を検索', ctrl: true, keys: ['f'], show: 'Ctrl + F' },
    { label: 'アドレスバーへ移動', ctrl: true, keys: ['l'], show: 'Ctrl + L' },
    { label: 'ブックマークに追加', ctrl: true, keys: ['d'], show: 'Ctrl + D' },
    { label: 'ページを更新', keys: ['f5'], show: 'F5' },
    { label: '履歴を開く', ctrl: true, keys: ['h'], show: 'Ctrl + H' },
    { label: 'ダウンロード一覧', ctrl: true, keys: ['j'], show: 'Ctrl + J' },
    { label: '印刷', ctrl: true, keys: ['p'], show: 'Ctrl + P' },
    { label: '拡大', ctrl: true, keys: ['+', '=', ';', 'equal', 'semicolon', 'numpadadd'], show: 'Ctrl + ＋' },
    { label: '縮小', ctrl: true, keys: ['-', 'minus', 'numpadsubtract'], show: 'Ctrl + －' },
    { label: '拡大率を100%に戻す', ctrl: true, keys: ['0', 'digit0', 'numpad0'], show: 'Ctrl + 0' },
    { label: 'ページの一番上へ', keys: ['home'], show: 'Home' },
    { label: 'ページの一番下へ', keys: ['end'], show: 'End' },
    { label: '1画面下へスクロール', keys: [' ', 'space'], show: 'Space' },
    { label: '1画面上へスクロール', shift: true, keys: [' ', 'space'], show: 'Shift + Space' },
  ] },
  sheets: { name: 'スプレッドシート/Excel', items: [
    { label: '太字', ctrl: true, keys: ['b'], show: 'Ctrl + B' },
    { label: '下線', ctrl: true, keys: ['u'], show: 'Ctrl + U' },
    { label: '斜体', ctrl: true, keys: ['i'], show: 'Ctrl + I' },
    { label: 'セルを編集', keys: ['f2'], show: 'F2' },
    { label: 'セル内で改行', alt: true, keys: ['enter'], show: 'Alt + Enter' },
    { label: '今日の日付を入力', ctrl: true, keys: [';', 'semicolon'], show: 'Ctrl + ;' },
    { label: '現在の時刻を入力', ctrl: true, shift: true, keys: [';', ':', 'semicolon', 'quote'], show: 'Ctrl + Shift + ;' },
    { label: '上のセルをコピー（下方向にフィル）', ctrl: true, keys: ['d'], show: 'Ctrl + D' },
    { label: '左のセルをコピー（右方向にフィル）', ctrl: true, keys: ['r'], show: 'Ctrl + R' },
    { label: '列全体を選択', ctrl: true, keys: [' ', 'space'], show: 'Ctrl + Space' },
    { label: '行全体を選択', shift: true, keys: [' ', 'space'], show: 'Shift + Space' },
    { label: 'データの端まで移動（下）', ctrl: true, keys: ['arrowdown'], show: 'Ctrl + ↓' },
    { label: 'データの端まで選択（下）', ctrl: true, shift: true, keys: ['arrowdown'], show: 'Ctrl + Shift + ↓' },
    { label: 'A1 セルへ移動', ctrl: true, keys: ['home'], show: 'Ctrl + Home' },
    { label: 'リンクを挿入', ctrl: true, keys: ['k'], show: 'Ctrl + K' },
    { label: '値のみ貼り付け', ctrl: true, shift: true, keys: ['v'], show: 'Ctrl + Shift + V' },
    { label: '検索と置換', ctrl: true, keys: ['h'], show: 'Ctrl + H' },
  ] },
  ime: { name: '文字入力', items: [
    { label: 'ひらがなに変換', keys: ['f6'], show: 'F6' },
    { label: '全角カタカナに変換', keys: ['f7'], show: 'F7' },
    { label: '半角カタカナに変換', keys: ['f8'], show: 'F8' },
    { label: '全角英数に変換', keys: ['f9'], show: 'F9' },
    { label: '半角英数に変換', keys: ['f10'], show: 'F10' },
    { label: '単語ごとに削除（前）', ctrl: true, keys: ['backspace'], show: 'Ctrl + BackSpace' },
    { label: '行頭へ移動', keys: ['home'], show: 'Home' },
    { label: '行末へ移動', keys: ['end'], show: 'End' },
    { label: '行頭まで選択', shift: true, keys: ['home'], show: 'Shift + Home' },
    { label: '行末まで選択', shift: true, keys: ['end'], show: 'Shift + End' },
    { label: '1文字ずつ選択（右）', shift: true, keys: ['arrowright'], show: 'Shift + →' },
    { label: '単語ごとに移動（右）', ctrl: true, keys: ['arrowright'], show: 'Ctrl + →' },
  ] },
};
