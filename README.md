# drink-savings-app

世帯単位で飲酒記録と「1 杯 = 500 円」の貯金換算を行う **Next.js（App Router）PWA**。データは **Supabase**（Auth + PostgreSQL + RLS）。

## ドキュメント

| 内容 | 場所 |
|------|------|
| **このリポジトリの変更・運用まとめ** | [`docs/MILESTONE_SUMMARY.md`](docs/MILESTONE_SUMMARY.md) |
| **要件・アーキテクチャ・タスクリスト（親フォルダ側）** | `../python/doc/drinking_app_*.md`（開発マシン上のパス。内容は現行実装と同期済み 2026-05） |
| **DB 正本** | [`supabase/schema.sql`](supabase/schema.sql) |
| **テストデータ削除・ユーザー削除（要レビュー）** | [`supabase/scripts/purge_test_data_and_user.sql`](supabase/scripts/purge_test_data_and_user.sql) |

## 開発

```bash
npm install
npm run dev
```

環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`（`.env.local`）。

```bash
npm run build
```

## デプロイ

[Vercel](https://vercel.com) 想定。環境変数はローカルと同様に設定。

---

以下は `create-next-app` 由来の参照リンクです。

- [Next.js Documentation](https://nextjs.org/docs)
