# Markdown Kanban

Markdownファイル内のTODOリスト（チェックボックス）をカンバンボード形式で表示・操作できるVSCode拡張機能です。

## 特徴

- **Markdownネイティブ**: Markdownの標準記法を尊重し、素のMarkdownとしても可読性を維持
- **見出し階層をパスとして活用**: 見出し階層を「パス」として解釈し、タスクのグルーピングに使用
- **WebViewカンバンボード**: WebViewパネルでカンバンボードを表示
- **双方向同期**: エディタとボードの双方向同期

## 使い方

### 基本的なMarkdown記法

```markdown
# プロジェクト

## フロントエンド

- [ ] UI設計
- [x] コンポーネント実装
  - status: done

## バックエンド

- [ ] API設計
  - status: todo
  - priority: high
```

### ステータス管理

タスクの子要素として `- status: <ステータス>` を記述することで、カスタムステータスを設定できます。

### カンバンボードの表示

コマンドパレット（`Cmd+Shift+P` / `Ctrl+Shift+P`）から「Markdown Kanban: Open Kanban Board」を実行します。

## 拡張機能の設定

この拡張機能は以下の設定に対応しています：

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `markdownKanban.statuses` | 利用可能なステータス一覧 | `["todo", "in-progress", "done"]` |
| `markdownKanban.doneStatuses` | 完了とみなすステータス | `["done"]` |
| `markdownKanban.defaultStatus` | 新規タスクのデフォルトステータス | `"todo"` |
| `markdownKanban.defaultDoneStatus` | タスク完了時のデフォルトステータス | `"done"` |
| `markdownKanban.sortBy` | タスクのソート基準 | `"none"` |
| `markdownKanban.syncCheckboxWithDone` | チェックボックスと完了ステータスを連動 | `true` |

### フロントマターでの設定

Markdownファイルのフロントマターで、ファイル固有の設定を上書きできます：

```yaml
---
kanban:
  statuses: [backlog, doing, review, done]
  doneStatuses: [done]
  defaultStatus: backlog
  syncCheckboxWithDone: true
---
```

## 開発

### 必要条件

- Node.js 24
- pnpm

### セットアップ

```bash
pnpm install
```

### ビルド

```bash
pnpm run compile
```

### テスト

```bash
pnpm run test
```

### 開発モード

```bash
pnpm run watch
```

## 技術スタック

- TypeScript（strict mode）
- React（WebView UI）
- Tailwind CSS v4
- shadcn/ui
- Vite
- Vitest
- Biome

## ライセンス

MIT

## 変更履歴

[CHANGELOG.md](./CHANGELOG.md) を参照してください。
