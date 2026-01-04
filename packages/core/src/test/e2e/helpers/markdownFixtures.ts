/**
 * テスト用Markdownファイルの内容
 */

/**
 * 空のMarkdownファイル
 */
export const EMPTY_MARKDOWN = '';

/**
 * 基本的なタスクを含むMarkdownファイル
 */
export const BASIC_TASKS_MARKDOWN = `# Project

- [ ] Task 1
- [ ] Task 2
- [x] Task 3
`;

/**
 * 見出し階層を持つMarkdownファイル
 */
export const NESTED_HEADINGS_MARKDOWN = `# Work

## Project A
- [ ] Task in Project A

## Project B
- [ ] Task in Project B

# Personal
- [ ] Personal task
`;

/**
 * メタデータ付きタスクを含むMarkdownファイル
 */
export const TASKS_WITH_METADATA_MARKDOWN = `# Project

- [ ] Task with status
  - status: in-progress

- [ ] Task with priority
  - priority: high

- [ ] Task with due date
  - due: 2025-01-15

- [ ] Task with all metadata
  - status: todo
  - priority: high
  - due: 2025-01-20
`;

/**
 * フロントマター付きMarkdownファイル
 */
export const WITH_FRONTMATTER_MARKDOWN = `---
kanban:
  statuses:
    - backlog
    - doing
    - done
  doneStatuses:
    - done
  defaultStatus: backlog
---

# Project

- [ ] Task 1
- [ ] Task 2
`;

/**
 * 複数のステータスを持つタスクを含むMarkdownファイル
 */
export const MULTIPLE_STATUSES_MARKDOWN = `# Project

- [ ] Todo task
  - status: todo

- [ ] In progress task
  - status: in-progress

- [x] Done task
  - status: done
`;
