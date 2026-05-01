# drink-savings-app — 開発マイルストーンまとめ（〜2026年5月）

この文書は、ホーム UI・アイコン・内訳表示・データ保守・Git 状態まで、これまでの変更と運用上の注意を **一括参照用** に整理したものです。

---

## 1. 概要

- **アプリ**: Next.js（App Router）による飲酒記録 PWA。Supabase（Auth + Postgres）で世帯単位共有。
- **このマイルストーンのゴール**: 入力ボタンをタイル化、ホーム縦方向の圧縮、酒別内訳の省略解除・折り返し、焼酎のみカスタム PNG グリフの視認性向上、テストデータ削除用 SQL の用意、リポジトリにタグ／スナップショットブランチを残す。

---

## 2. 飲酒入力タイル（ホーム・日付ページ）

### 仕様

- **対象画面**: `src/app/page.tsx`（ホーム）、`src/app/day/[date]/page.tsx`（特定日）。
- **レイアウト**: 常に **横 3 列 × 縦 2 行**（6 種）。
- **見た目**: 角丸カード、`rounded-xl`、`shadow-sm`、種類ごとの **下縞アクセント**（色は `src/lib/drinkShared.ts` の `DRINK_INPUT_TILE_ACCENT_CLASS`）。
- **ラベル**: `DRINKS[].label`（ビール … その他）をタイル内に表示。**画像に文字は含めない**方針でコード側が文言を担当。

### アセット

- **パス定義**: `DRINK_INPUT_TILE_ICON_SRC`（同ファイル）。既定ファイル名は `/icons/*_128.png`。
- **ディレクトリ**: `public/icons/`（例: `beer_128.png` … `other_128.png`）。
- **旧タイル用 PNG の退避**: `public/icons/archive/tile-128-pre-generative-replace/` にコピーを保持（削除ではなくアーカイブ）。
- **DrinkGlyph 用焼酎**: タイルの `shochu_128.png` とは別。**`/icons/shochu.png`** をインライン表示に使用（一覧・履歴など）。

### デザイナー／生成 AI 向けメモ（参照仕様）

会話で確定した生成・書き出しの方向性（要点のみ）:

| 項目 | 内容 |
|------|------|
| サイズ | 128×128 PNG、透過可；Web 向けに @2x/@3x も可 |
| 線 | 実用寄り・やや太め（2〜3px 相当 @128） |
| 色 | 種類ごとカラーアウトライン（黄／茶／赤／青／緑／紫）、ダークモードでも潰れないコントラスト |
| 焼酎モチーフ | レモン付きソーダ（酎ハイ寄り）を第一希望 |
| 余白 | タイル専用・**やや大きめ描き・透過余白は抑える** |

**注意**: スクリーンショットからの切り出しより、**ベクター／高解像度の書き出し**が品質面では有利。生成 AI は参照とピクセル一致は期待しない（近似）。

---

## 3. インラインの酒別内訳（DrinkBreakdownInline）

- **ファイル**: `src/components/DrinkBreakdownInline.tsx`
- **変更の要点**:
  - `getDrinkBreakdownRows` の既定 `maxParts` を **6**（最大種類数）にし、「…」による省略を実質なくした。
  - コンテナを **`inline-flex flex-wrap`** + `gap` にし、横に収まらないとき **折り返し**。
  - 各「アイコン + 件数」は `inline-flex items-center` + `whitespace-nowrap` でまとまりを維持。

---

## 4. 焼酎の絵文字代替（DrinkGlyph）

- **ファイル**: `src/components/DrinkGlyph.tsx`
- **挙動**: `drinkType === "shochu"` のときのみ **`/icons/shochu.png`** を表示。他種別は従来どおり Unicode 絵文字（`getDrinkEmoji`）。
- **サイズ調整の経緯**:
  - 親が **`text-[11px]`** のとき、`em` だけでは OS 絵文字より著しく小さく見える。
  - 対策: **`max(1.75em, 1.35rem)`** で **親フォントが小さいときは rem でフロア**し、絵文字に近い視サイズを確保。
- **タイル用 `shochu_128.png`** と **インライン用 `shochu.png`** は役割が異なる（両方維持）。

---

## 5. ホーム画面レイアウト（縦の圧縮・情報配置）

実装は主に **`src/app/page.tsx`**。

| 変更 | 内容 |
|------|------|
| セクション間隔 | メインコンテナ `gap-6` → `gap-4` など |
| 集計詳細 | サマリーカード上から削除し、**ログイン時ヘッダー右**（タイトル横のブロック）へ移動 |
| 今日の飲酒量 | 見出しと **日付ラベルを同一行**（`justify-between`、狭い幅は折り返し） |
| 文言削除 | **「（実日の今日）」** を削除 |
| 月の見出し | **「YYYY年M月の飲酒量」** を常に 1 行 |
| カレンダー | **← / 今月 / →** は **曜日行の直上**のみ。同一行に **`YYYY年M月`** を表示 |
| 今日／今月カード | `p-3`→`p-2`、`gap` 縮小、空プレースホルダー `min-h` 調整など |
| 選択日サマリー | 杯数・金額と内訳を `flex-wrap` で折り返しやすく |

---

## 6. Supabase / データベース

### スキーマ概要（参照）

- `households`, `household_members`, `user_profiles`, `drink_logs`（`drank_on` など）は `supabase/schema.sql` を参照。
- `drink_logs.user_id` は `auth.users` に **ON DELETE CASCADE**（ユーザー削除時にログも削除される想定）。

### テストデータ全削除・ユーザー削除スクリプト

- **ファイル**: `supabase/scripts/purge_test_data_and_user.sql`
- **実行場所**: Supabase Dashboard → **SQL Editor**（DB オーナー権限）。**実行前に必ず内容確認・バックアップ推奨**。
- **処理の流れ（概要）**:
  1. `drink_logs_archive` に `drink_logs` のスナップショットを INSERT（アーカイブ）
  2. **`drink_logs` 全件 DELETE**（全ユーザー・全世帯の記録が消える）
  3. `user_profiles.display_name = 'ゆうすけテスト'` に対応する **`auth.users` を DELETE**
  4. メンバーがいない **`households` を DELETE**

**警告**:

- 手順 2 は **アプリ上の全飲酒ログを削除**する。
- 表示名が完全一致しない場合は SQL 内の文字列を実データに合わせて修正すること。
- アーカイブブロックだけ不要な場合はコメントアウトして手順 2 以降のみ実行してよい。

---

## 7. Git（参照ポインタ）

| 種類 | 名前 | 指す内容の目安 |
|------|------|----------------|
| タグ | `v0.1.0`（注釈付き） | タイル UI・ホーム圧縮・内訳折り返し・焼酎グリフ調整などを含むスナップショット |
| ブランチ | `snapshot/2026-05-home-ui` | 上記と同一コミットから作成した参照用ブランチ |

リモート: `origin`（例: `github.com:yuusuke0126/drink-savings-app.git`）。

---

## 8. 関連ソース一覧（よく触るファイル）

| パス | 役割 |
|------|------|
| `src/lib/drinkShared.ts` | ドリンク型、`DRINKS`、`DRINK_INPUT_TILE_*`、`getDrinkBreakdownRows` など |
| `src/components/DrinkGlyph.tsx` | 焼酎 PNG / 他絵文字 |
| `src/components/DrinkBreakdownInline.tsx` | インライン酒別内訳 |
| `src/app/page.tsx` | ホーム全体 UI |
| `src/app/day/[date]/page.tsx` | 日付ページ・入力タイル |
| `public/icons/` | タイル用 `*_128.png`、`shochu.png`、アーカイブサブフォルダ |

---

## 9. 検討・未実装（会話で触れただけ）

- **DrinkGlyph プレビュー専用ページ**（開発時に絵文字と並べて確認）: 必要なら `/preview/...` などで追加可能。
- **スクリーンショットからの同一ピクセル再現**: 生成 AI では困難。ベクター再トレースや元データ書き出しが現実的。

---

## 10. ローカル確認コマンド

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド検証
```

---

*このファイルはマイルストーン記録用です。運用ルールやバージョン番号の付け方はチーム方針に合わせて更新してください。*
