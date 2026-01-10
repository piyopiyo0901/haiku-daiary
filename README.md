# おやの俳句

目が疲れやすい親世代向けの、俳句 5-7-5 エディタ + 一日一句カレンダー。
API もログインも不要、端末内の LocalStorage だけで動くシンプルな Web アプリです。

## できること
- 上五・中七・下五の文字数を見ながら俳句を作成
- 今日の一句を保存（1 日 1 句）
- カレンダー / 一覧で見返し
- キーワード検索
- 季語ガチャで季語・読み方・季節を表示
- JSON でバックアップ / 復元

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
- 作る: 上五・中七・下五を入力し「今日に保存」
- 見る: カレンダー / 一覧を切り替えて見返す
- 検索: 入力したキーワードで一覧を絞り込み
- バックアップ: 「JSONを書き出す」で保存、「JSONを読み込む」で復元

## データについて
- 端末内の LocalStorage に保存されます
- 端末の故障・ブラウザデータ削除で消える可能性があります
- 大切な句は定期的にバックアップしてください

## LocalStorage キー
- `haiku_draft_v1`
- `haiku_entries_v1`

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
