# 新人教育アプリ

社員が教育項目を履修 → 責任者が承認、日報を提出 → 責任者が確認、という流れのアプリです。
ビルド不要（HTML / CSS / JS のみ）。Firebase（Auth + Firestore、無料プラン）と GitHub Pages で動きます。

## ファイル構成

```
index.html          社員用の画面
admin.html          責任者用の画面（最大5アカウント）
css/style.css       共通スタイル
js/firebase-config.js  ← Firebase の設定をここに貼る（アプリ名もここ）
js/common.js        共通処理
js/employee.js      社員側の処理
js/admin.js         責任者側の処理
firestore.rules     Firestore に貼るセキュリティルール
manifest.json / manifest-admin.json   ホーム画面追加用
icons/              アイコン
```

## セットアップの流れ（概要）

1. Firebase コンソールでプロジェクトを作る（Spark 無料プラン）
2. Authentication → ログイン方法 → 「メール / パスワード」を有効にする
3. Authentication → Users → 最初の責任者のアカウントを追加する（メール＋パスワード）
4. Firestore Database を作る（本番環境モード）→ ルールタブに `firestore.rules` の中身を貼って公開
5. Firestore → 「コレクションを開始」→ コレクション ID `admins`、ドキュメント ID に責任者のメールアドレス（小文字）、フィールド `name`（文字列）に表示名を入れて保存
6. プロジェクトの設定 → マイアプリ → ウェブアプリを追加 → 表示される `firebaseConfig` を `js/firebase-config.js` に貼る
7. GitHub にパブリックリポジトリを作り、このフォルダの中身をアップロード → Settings → Pages で公開（Branch: main / root）
8. Firebase の Authentication → 設定 → 承認済みドメイン に `ユーザー名.github.io` を追加する
9. `https://ユーザー名.github.io/リポジトリ名/admin.html` を Safari で開いてログイン → 「共有」→「ホーム画面に追加」

社員用は `https://ユーザー名.github.io/リポジトリ名/`（index.html）です。

## 教育項目のまとめ登録

責任者画面 → 項目 → まとめ登録。スプレッドシートの表（段階 / カテゴリ / チェック欄 / 題名 / 内容 の列）をコピーしてそのまま貼り付けると、
「1週目」「座学系」などの見出し行を段階・カテゴリとして自動で読み取ります（TRUE/FALSE のチェック欄は無視）。
手書きの場合は `# 1週目` `## 座学系` の見出しと `題名｜説明｜URL` の行で書けます。

## 段階の許可制

責任者画面 → 設定 → 「段階の許可制」をオンにすると、責任者が許可した段階だけが社員に表示されます。
許可は社員詳細画面の「段階の許可」欄で段階ごとにオン／オフ（`approvals/{uid}.unlocked` に保存）。
オンにした時点で、各社員の進行中の段階と最初の段階は自動で許可されます。

## ファイルを更新したのに画面が変わらないとき

バージョン番号は3か所で管理しています（更新用 ZIP では毎回そろえて上げてあります）。
- `index.html` / `admin.html` の `?v=9`
- `js/common.js` の `APP_VERSION`
- `version.json`

「↻ 更新」ボタンを押すと `version.json` を確認し、番号が新しければ自動でページを読み込み直します。起動時にも静かに確認します。

## アプリ名を変えるには

- `js/firebase-config.js` の `APP_NAME`
- `manifest.json` と `manifest-admin.json` の `name` / `short_name`
- 各 HTML の `<title>` と `apple-mobile-web-app-title`

## データの持ち方（Firestore）

| コレクション | 内容 |
|---|---|
| `admins/{メール}` | 責任者。ドキュメントがあれば責任者扱い |
| `employees/{uid}` | 社員（name, email, active） |
| `items/{id}` | 教育項目（title, description, type, videoUrl, phase＝段階, group＝カテゴリ, order, published） |
| `progress/{uid}` | 社員が「履修済み」にした項目（done: {itemId: 時刻}） |
| `approvals/{uid}` | 責任者の承認（items: {itemId: {at, by}}）と段階の許可（unlocked: {段階名: true}） |
| `reports/{id}` | 日報（uid, name, date, checks, text, confirmations） |
| `notes/{uid}` | 責任者メモ（entries: [{text, author, at}]） |
| `settings/reportTemplate` | 日報のチェック項目（items: [...]） |
| `settings/app` | アプリ設定（phaseLock: 段階の許可制） |
