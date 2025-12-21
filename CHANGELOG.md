# Change Log

All notable changes to the "markdown-kanban" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2025-12-21

### Added

- **Core Features**
  - Markdownファイル内のTODOリスト（チェックボックス）をカンバンボード形式で表示
  - 見出し階層を「パス」として解釈し、タスクのグルーピングに使用
  - WebViewパネルでのカンバンボード表示
  - エディタとボードの双方向同期

- **タスク管理**
  - タスクの作成・更新・削除
  - ステータス変更（ドラッグ&ドロップ対応）
  - チェックボックスと完了ステータスの連動
  - カスタムステータスのサポート

- **設定機能**
  - VSCode設定による拡張機能のカスタマイズ
  - フロントマターによるファイル固有の設定
  - 設定の優先順位: フロントマター > VSCode設定 > デフォルト

- **開発基盤**
  - クリーンアーキテクチャによる設計
  - TypeScript strict modeでの型安全な実装
  - 249件のユニットテスト・統合テスト
  - 77%以上のコードカバレッジ

### Technical Details

- **Architecture**: Clean Architecture (Domain / Application / Interface / Infrastructure / Bootstrap)
- **UI**: React + Tailwind CSS v4 + shadcn/ui
- **Build**: Vite
- **Test**: Vitest with 77% code coverage
- **Linting**: Biome

[Unreleased]: https://github.com/kyuki3rain/markdown-kanban/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kyuki3rain/markdown-kanban/releases/tag/v0.1.0
