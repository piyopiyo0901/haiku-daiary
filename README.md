# おやの俳句メモ

親世代向けの、俳句をためて見返すシンプルなメモアプリです。API もログインも不要で、端末内の LocalStorage だけで動きます。

## できること
- 1つの入力欄で俳句を記録
- 季節（春/夏/秋/冬/無季）を選択
- 一覧で新しい順に表示
- キーワード検索と季節フィルタ
- 読みベースの文字数カウント

## 技術
- Next.js (App Router) + TypeScript
- Tailwind + 独自 CSS
- クライアント完結 (LocalStorage)

## 起動方法
```
npm install
npm run dev
```
`http://localhost:3000` を開きます。

## 使い方
- 一覧画面で検索・季節フィルタを使い、俳句をタップして編集
- 「新しく作る」で追加
- よみ欄を入れると文字数が正確に数えられます

## 読みベースのカウントについて
MVPでは外部APIや形態素解析を使わず、オフライン完結を優先しました。
そのため「よみ（ひらがな）」入力欄を用意し、ここに入力された文字列でカウントします。
よみが空の場合は本文から仮計算しますが、漢字の読み変換は行わないため正確ではありません。

## データについて
- 端末内の LocalStorage に保存されます
- 端末の故障・ブラウザデータ削除で消える可能性があります

## LocalStorage キー
- `haiku_memo_draft_v2`
- `haiku_memo_entries_v2`

## テスト (読みカウント)
```
npm run test:reading
```

## デプロイ
### Vercel
1. GitHub にプッシュ
2. Vercel で新規プロジェクト作成
3. Framework: Next.js を選択
4. Build Command: `npm run build`

### Netlify
1. GitHub にプッシュ
2. Netlify で新規サイト作成
3. Build Command: `npm run build`
4. Publish Directory: `.next`

## ドキュメント
- 両親向けの使い方: `docs/parents-guide.md`
- 動作確認: `docs/verification.md`
