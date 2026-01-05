# Hotfix ワークフロー

本番リリース後に緊急のバグ修正が必要な場合のワークフロー。mainブランチの未リリース変更を含めずに、最小限の修正のみをリリースできる。

---

## 概要

```
v0.1.1 (タグ)
    │
    ├──────────────────────────> main (未リリースの新機能)
    │                                    │
    └── hotfix/issue-XX ─────────────────┘
              │                    (PR マージ)
              │
         v0.1.2 (タグ)
```

**重要な概念:**

- **タグはコミットへのポインタ**: リリースタグは特定のコミットを指す。hotfixブランチ上でタグを作成すれば、そのブランチの状態がリリースされる
- **PRマージは追加操作**: hotfixをmainにマージしても、mainの既存コミットには影響しない
- **リリースビルドはタグを参照**: CI/CDはタグが指すコミットでビルドするため、mainの未リリース変更は含まれない

---

## ワークフロー手順

### 1. Issueの作成

バグを調査し、Issueを作成する。

```bash
gh issue create --title "バグのタイトル" --body "バグの詳細説明"
```

### 2. リリースタグからhotfixブランチを作成

**重要**: mainからではなく、修正対象のリリースタグから分岐する。

```bash
# 最新のタグを確認
git tag --sort=-v:refname | head -5

# タグからhotfixブランチを作成
git checkout -b hotfix/issue-XX v0.1.1
```

### 3. 修正を実装

1. テストで問題を再現
2. 修正を実装
3. テストがパスすることを確認

```bash
# テスト実行
devbox run test

# 変更をコミット
git add .
git commit -m "fix: バグの修正内容

Fixes #XX"
```

### 4. バージョン更新

パッチバージョンを上げる。

```bash
# package.json のバージョンを更新 (例: 0.1.1 → 0.1.2)
```

`package.json`:
```json
{
  "version": "0.1.2"
}
```

### 5. CHANGELOGの更新

`CHANGELOG.md` に変更内容を追記:

```markdown
## [0.1.2] - YYYY-MM-DD

### Fixed
- バグの修正内容 (#XX)
```

### 6. PRの作成

hotfixブランチをリモートにプッシュし、**mainブランチへの**PRを作成する。

```bash
git push -u origin hotfix/issue-XX

gh pr create --base main --title "fix: バグのタイトル" --body "## Summary
- バグの修正内容

Fixes #XX"
```

### 7. PRのマージ

レビュー後、PRをマージする（GitHub UI または `gh pr merge`）。

### 8. リリースタグの作成

**重要**: タグはhotfixブランチ上で作成する（mainではない）。

```bash
# hotfixブランチにいることを確認
git checkout hotfix/issue-XX

# タグを作成
git tag -a v0.1.2 -m "v0.1.2: 修正内容の要約"

# タグをプッシュ
git push origin v0.1.2
```

### 9. リリース

タグをプッシュすると、CI/CDが自動的にリリースビルドを実行する（設定されている場合）。

手動リリースの場合:
```bash
gh release create v0.1.2 --title "v0.1.2" --notes "修正内容"
```

---

## なぜこれが機能するのか

### タグとブランチの独立性

Git のタグは特定のコミットへのポインタであり、ブランチとは独立している。

```
コミット履歴:
A --- B --- C --- D --- E  (main)
       \
        F --- G  (hotfix/issue-XX)
              ↑
           v0.1.2 (タグ)
```

- `v0.1.2` タグはコミット G を指す
- main にマージしても、タグは G を指し続ける
- リリースビルドは G の状態（= A + B + F + G）で行われる
- C, D, E の変更は含まれない

### PRマージの動作

hotfix を main にマージすると:

```
A --- B --- C --- D --- E --- M  (main)
       \                     /
        F --- G -------------
              ↑
           v0.1.2
```

- M はマージコミット
- main は F, G の変更を取り込む
- タグ v0.1.2 は依然として G を指す（変わらない）

---

## チェックリスト

- [ ] リリースタグからhotfixブランチを作成した（mainからではない）
- [ ] テストで問題を再現し、修正後にパスすることを確認した
- [ ] `package.json` のバージョンを更新した
- [ ] `CHANGELOG.md` を更新した
- [ ] PRを作成し、mainにマージした
- [ ] **hotfixブランチ上で**リリースタグを作成した
- [ ] タグをリモートにプッシュした

---

## 実例: v0.1.2 (CRLF修正)

Issue #84 の修正を例として:

1. **問題**: Windows CRLF改行コードでstatus更新が失敗
2. **原因**: 正規表現の `$` が `\r` にマッチしない
3. **修正**: 正規表現に `\r?` を追加

```bash
# v0.1.1からhotfixブランチを作成
git checkout -b hotfix/issue-84-crlf-fix v0.1.1

# 修正を実装・コミット
git commit -m "fix: Windows CRLF改行コードでstatus更新が失敗するバグを修正"

# バージョン・CHANGELOG更新
git commit -m "docs: v0.1.2のCHANGELOGを追加"

# PRを作成（mainへ）
gh pr create --base main

# PRマージ後、hotfixブランチでタグ作成
git checkout hotfix/issue-84-crlf-fix
git tag -a v0.1.2 -m "v0.1.2: Fix Windows CRLF line ending issue"
git push origin v0.1.2
```

結果:
- `v0.1.2` リリースには CRLF修正のみ含まれる
- main には CRLF修正 + 既存の新機能が含まれる
