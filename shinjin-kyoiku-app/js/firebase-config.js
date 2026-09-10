/* =========================================================
   Firebase 設定
   Firebase コンソール → プロジェクトの設定 → マイアプリ → 「SDK の設定と構成」
   に表示される firebaseConfig の中身をそのまま貼り付けてください。
   ========================================================= */
const firebaseConfig = {
  apiKey: "ここに貼り付け",
  authDomain: "ここに貼り付け.firebaseapp.com",
  projectId: "ここに貼り付け",
  storageBucket: "ここに貼り付け.appspot.com",
  messagingSenderId: "ここに貼り付け",
  appId: "ここに貼り付け"
};

/* アプリ名（画面上部とホーム画面のアイコン下に表示）
   ※ manifest.json / manifest-admin.json の "name" も合わせて変えてください */
const APP_NAME = "新人教育";
