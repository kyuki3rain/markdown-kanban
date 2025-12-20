import { describe, expect, it } from 'vitest';
import { MarkdownParser } from './markdownParser';

describe('MarkdownParser', () => {
	describe('parseMarkdown', () => {
		describe('チェックボックスの認識', () => {
			it('未完了のチェックボックスを認識する', () => {
				const markdown = '- [ ] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[0].isChecked).toBe(false);
			});

			it('完了のチェックボックスを認識する', () => {
				const markdown = '- [x] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[0].isChecked).toBe(true);
			});

			it('大文字のXも完了として認識する', () => {
				const markdown = '- [X] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].isChecked).toBe(true);
			});

			it('複数のチェックボックスを認識する', () => {
				const markdown = `- [ ] タスク1
- [x] タスク2
- [ ] タスク3`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(3);
				expect(tasks[0].title).toBe('タスク1');
				expect(tasks[1].title).toBe('タスク2');
				expect(tasks[2].title).toBe('タスク3');
			});

			it('通常のリストはタスクとして認識しない', () => {
				const markdown = `- 通常のリスト
- [ ] タスク`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク');
			});
		});

		describe('見出し階層の解析（パス抽出）', () => {
			it('見出し配下のタスクにパスを設定する', () => {
				const markdown = `# 仕事
- [ ] タスク1`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事']);
			});

			it('ネストした見出しのパスを正しく解析する', () => {
				const markdown = `# 仕事
## プロジェクトA
- [ ] タスク1`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事', 'プロジェクトA']);
			});

			it('見出しレベルが飛んでも正しく解析する', () => {
				const markdown = `# 仕事
### 深いセクション
- [ ] タスク1`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事', '深いセクション']);
			});

			it('見出しがない場合はルートパスになる', () => {
				const markdown = '- [ ] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.isRoot()).toBe(true);
			});

			it('異なる見出し配下のタスクは異なるパスを持つ', () => {
				const markdown = `# 仕事
- [ ] タスク1

# 個人
- [ ] タスク2`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].path.segments).toEqual(['仕事']);
				expect(tasks[1].path.segments).toEqual(['個人']);
			});
		});

		describe('子要素の解析（key: value形式）', () => {
			it('statusメタデータを認識する', () => {
				const markdown = `- [ ] タスク1
  - status: in-progress`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('in-progress');
			});

			it('複数のメタデータを認識する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
  - due: 2025-01-15`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('todo');
				expect(tasks[0].metadata.priority).toBe('high');
				expect(tasks[0].metadata.due).toBe('2025-01-15');
			});

			it('key: value形式でないリストは無視する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - これはメモです
  - priority high`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].metadata).not.toHaveProperty('これはメモです');
				expect(tasks[0].metadata).not.toHaveProperty('priority high');
			});

			it('空のkeyは無視する', () => {
				const markdown = `- [ ] タスク1
  - : 値だけ`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(Object.keys(tasks[0].metadata)).toHaveLength(0);
			});

			it('statusがない場合はチェック状態からデフォルトステータスを設定する', () => {
				const markdown = `- [ ] 未完了タスク
- [x] 完了タスク`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].status.value).toBe('todo');
				expect(tasks[1].status.value).toBe('done');
			});
		});

		describe('引用・コードブロック内の除外', () => {
			it('引用内のチェックボックスは無視する', () => {
				const markdown = `- [ ] 通常のタスク

> - [ ] 引用内のチェックボックス`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('通常のタスク');
			});

			it('コードブロック内のチェックボックスは無視する', () => {
				const markdown = `- [ ] 通常のタスク

\`\`\`
- [ ] コードブロック内
\`\`\``;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('通常のタスク');
			});

			it('インラインコード内のチェックボックスは無視する', () => {
				const markdown = '- [ ] タスク `- [ ] インラインコード`';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(1);
				expect(tasks[0].title).toBe('タスク `- [ ] インラインコード`');
			});
		});

		describe('フロントマターのパース', () => {
			it('フロントマターからkanban設定を読み取る', () => {
				const markdown = `---
kanban:
  statuses:
    - todo
    - in-progress
    - done
  doneStatuses:
    - done
  defaultStatus: todo
  defaultDoneStatus: done
---

- [ ] タスク1`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeDefined();
				expect(config?.statuses).toEqual(['todo', 'in-progress', 'done']);
				expect(config?.doneStatuses).toEqual(['done']);
				expect(config?.defaultStatus).toBe('todo');
				expect(config?.defaultDoneStatus).toBe('done');
			});

			it('フロントマターがなくてもパースできる', () => {
				const markdown = '- [ ] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeUndefined();
			});

			it('フロントマターにkanban設定がなくてもパースできる', () => {
				const markdown = `---
title: My Document
---

- [ ] タスク1`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { config } = result._unsafeUnwrap();
				expect(config).toBeUndefined();
			});
		});

		describe('タスクID生成', () => {
			it('パス + タイトルからタスクIDを生成する', () => {
				const markdown = `# 仕事
## プロジェクトA
- [ ] APIの実装`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].id).toBe('仕事 / プロジェクトA::APIの実装');
			});

			it('ルートパスの場合はタイトルのみがIDになる', () => {
				const markdown = '- [ ] タスク1';
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].id).toBe('（ルート）::タスク1');
			});
		});

		describe('重複タスク検出', () => {
			it('同じパスに同じタイトルのタスクがある場合、警告を生成する', () => {
				const markdown = `# 仕事
- [ ] APIの実装
- [ ] APIの実装`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks, warnings } = result._unsafeUnwrap();
				expect(tasks).toHaveLength(2);
				expect(warnings).toHaveLength(1);
				expect(warnings[0]).toContain('重複タスクを検出');
				expect(warnings[0]).toContain('APIの実装');
			});

			it('異なるパスの同じタイトルは重複とみなさない', () => {
				const markdown = `# 仕事
- [ ] タスク

# 個人
- [ ] タスク`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { warnings } = result._unsafeUnwrap();
				expect(warnings).toHaveLength(0);
			});
		});

		describe('行番号の追跡', () => {
			it('タスクの行番号を追跡する', () => {
				const markdown = `# 仕事
- [ ] タスク1
- [ ] タスク2`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].startLine).toBe(2);
				expect(tasks[1].startLine).toBe(3);
			});

			it('子要素を含むタスクの終了行を追跡する', () => {
				const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
- [ ] タスク2`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { tasks } = result._unsafeUnwrap();
				expect(tasks[0].startLine).toBe(1);
				expect(tasks[0].endLine).toBe(3);
				expect(tasks[1].startLine).toBe(4);
			});
		});

		describe('見出しの抽出', () => {
			it('ファイル内の見出し一覧を抽出する', () => {
				const markdown = `# 仕事
## プロジェクトA
## プロジェクトB
# 個人`;
				const result = MarkdownParser.parse(markdown);

				expect(result.isOk()).toBe(true);
				const { headings } = result._unsafeUnwrap();
				expect(headings).toHaveLength(4);
				expect(headings[0].segments).toEqual(['仕事']);
				expect(headings[1].segments).toEqual(['仕事', 'プロジェクトA']);
				expect(headings[2].segments).toEqual(['仕事', 'プロジェクトB']);
				expect(headings[3].segments).toEqual(['個人']);
			});
		});
	});
});
