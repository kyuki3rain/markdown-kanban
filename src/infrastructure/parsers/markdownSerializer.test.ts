import { describe, expect, it } from 'vitest';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { MarkdownSerializer, type TaskEdit } from './markdownSerializer';

describe('MarkdownSerializer', () => {
	describe('updateTaskStatus', () => {
		it('タスクのステータスを更新する', () => {
			const markdown = `# 仕事
- [ ] タスク1
  - status: todo`;
			const edit: TaskEdit = {
				taskId: '仕事::タスク1',
				newStatus: Status.create('in-progress')._unsafeUnwrap(),
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- status: in-progress');
		});

		it('ステータスが存在しない場合は追加する', () => {
			const markdown = `- [ ] タスク1`;
			const edit: TaskEdit = {
				taskId: '（ルート）::タスク1',
				newStatus: Status.create('in-progress')._unsafeUnwrap(),
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- status: in-progress');
		});

		it('完了ステータスに変更するとチェックボックスも更新する', () => {
			const markdown = `- [ ] タスク1
  - status: todo`;
			const edit: TaskEdit = {
				taskId: '（ルート）::タスク1',
				newStatus: Status.create('done')._unsafeUnwrap(),
				doneStatuses: ['done'],
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [x] タスク1');
			expect(newMarkdown).toContain('- status: done');
		});

		it('未完了ステータスに変更するとチェックボックスも更新する', () => {
			const markdown = `- [x] タスク1
  - status: done`;
			const edit: TaskEdit = {
				taskId: '（ルート）::タスク1',
				newStatus: Status.create('todo')._unsafeUnwrap(),
				doneStatuses: ['done'],
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [ ] タスク1');
			expect(newMarkdown).toContain('- status: todo');
		});
	});

	describe('updateTaskTitle', () => {
		it('タスクのタイトルを更新する', () => {
			const markdown = `- [ ] 古いタイトル
  - status: todo`;
			const edit: TaskEdit = {
				taskId: '（ルート）::古いタイトル',
				newTitle: '新しいタイトル',
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [ ] 新しいタイトル');
			expect(newMarkdown).not.toContain('古いタイトル');
		});
	});

	describe('deleteTask', () => {
		it('タスクを削除する', () => {
			const markdown = `- [ ] タスク1
- [ ] タスク2`;
			const edit: TaskEdit = {
				taskId: '（ルート）::タスク1',
				delete: true,
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).not.toContain('タスク1');
			expect(newMarkdown).toContain('タスク2');
		});

		it('子要素を持つタスクを削除する', () => {
			const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
- [ ] タスク2`;
			const edit: TaskEdit = {
				taskId: '（ルート）::タスク1',
				delete: true,
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).not.toContain('タスク1');
			expect(newMarkdown).not.toContain('priority: high');
			expect(newMarkdown).toContain('タスク2');
		});
	});

	describe('createTask', () => {
		it('見出し配下にタスクを追加する', () => {
			const markdown = `# 仕事
- [ ] 既存タスク`;
			const edit: TaskEdit = {
				create: {
					title: '新規タスク',
					path: Path.create(['仕事']),
					status: Status.create('todo')._unsafeUnwrap(),
				},
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [ ] 新規タスク');
			// 新規タスクは見出し配下のタスクの後に追加される
			const existingIndex = newMarkdown.indexOf('既存タスク');
			const newIndex = newMarkdown.indexOf('新規タスク');
			expect(newIndex).toBeGreaterThan(existingIndex);
		});

		it('見出し配下にタスクがない場合は見出しの直後に追加する', () => {
			const markdown = `# 仕事

# 個人`;
			const edit: TaskEdit = {
				create: {
					title: '新規タスク',
					path: Path.create(['仕事']),
					status: Status.create('todo')._unsafeUnwrap(),
				},
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [ ] 新規タスク');
			// 仕事セクションと個人セクションの間に追加される
			const workIndex = newMarkdown.indexOf('# 仕事');
			const personalIndex = newMarkdown.indexOf('# 個人');
			const taskIndex = newMarkdown.indexOf('新規タスク');
			expect(taskIndex).toBeGreaterThan(workIndex);
			expect(taskIndex).toBeLessThan(personalIndex);
		});

		it('ルートパスにタスクを追加する', () => {
			const markdown = `- [ ] 既存タスク`;
			const edit: TaskEdit = {
				create: {
					title: '新規タスク',
					path: Path.create([]),
					status: Status.create('todo')._unsafeUnwrap(),
				},
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [ ] 新規タスク');
		});

		it('完了ステータスでタスクを作成するとチェックボックスがチェック済みになる', () => {
			const markdown = `# 仕事`;
			const edit: TaskEdit = {
				create: {
					title: '完了タスク',
					path: Path.create(['仕事']),
					status: Status.create('done')._unsafeUnwrap(),
				},
				doneStatuses: ['done'],
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			expect(newMarkdown).toContain('- [x] 完了タスク');
			expect(newMarkdown).toContain('- status: done');
		});
	});

	describe('エラーハンドリング', () => {
		it('存在しないタスクを更新しようとするとエラーを返す', () => {
			const markdown = `- [ ] タスク1`;
			const edit: TaskEdit = {
				taskId: '（ルート）::存在しないタスク',
				newStatus: Status.create('done')._unsafeUnwrap(),
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isErr()).toBe(true);
		});

		it('存在しない見出しにタスクを作成しようとするとエラーを返す', () => {
			const markdown = `# 仕事`;
			const edit: TaskEdit = {
				create: {
					title: '新規タスク',
					path: Path.create(['存在しないセクション']),
					status: Status.create('todo')._unsafeUnwrap(),
				},
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isErr()).toBe(true);
		});
	});

	describe('複合的な編集', () => {
		it('他のタスクに影響を与えずに編集できる', () => {
			const markdown = `# 仕事
- [ ] タスク1
  - status: todo
- [ ] タスク2
  - status: in-progress
- [x] タスク3
  - status: done`;
			const edit: TaskEdit = {
				taskId: '仕事::タスク2',
				newStatus: Status.create('done')._unsafeUnwrap(),
				doneStatuses: ['done'],
			};

			const result = MarkdownSerializer.applyEdit(markdown, edit);

			expect(result.isOk()).toBe(true);
			const newMarkdown = result._unsafeUnwrap();
			// タスク1は変更なし
			expect(newMarkdown).toContain('- [ ] タスク1');
			// タスク2は更新
			expect(newMarkdown).toContain('- [x] タスク2');
			// タスク3は変更なし
			expect(newMarkdown).toContain('- [x] タスク3');
		});
	});
});
