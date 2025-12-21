/**
 * ユースケース統合テスト
 *
 * Application層（ユースケース）とInfrastructure層（MarkdownTaskRepository）を
 * 統合してテストします。VscodeDocumentClientのみモック化し、実際のMarkdown
 * パース・シリアライズロジックを使用します。
 */
import { ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import { DEFAULT_CONFIG } from '../../domain/ports/configProvider';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { MarkdownTaskRepository } from '../../infrastructure/adapters/markdownTaskRepository';
import { MarkdownTaskClient } from '../../infrastructure/clients/markdownTaskClient';
import type { VscodeDocumentClient } from '../../infrastructure/clients/vscodeDocumentClient';
import { ChangeTaskStatusUseCase } from './changeTaskStatusUseCase';
import { CreateTaskUseCase } from './createTaskUseCase';
import { DeleteTaskUseCase } from './deleteTaskUseCase';
import { GetTasksUseCase } from './getTasksUseCase';
import { UpdateTaskUseCase } from './updateTaskUseCase';

/**
 * VscodeDocumentClientのモックを作成する
 * markdownContentを変更可能な変数として保持し、読み書きを追跡する
 */
const createMockDocumentClient = (
	initialContent: string,
): {
	client: VscodeDocumentClient;
	getContent: () => string;
} => {
	let content = initialContent;

	// VscodeDocumentClientの必要なメソッドをモック化
	const client = {
		getActiveDocumentText: vi.fn().mockImplementation(() => ok(content)),
		replaceDocumentText: vi.fn().mockImplementation((newContent: string) => {
			content = newContent;
			return Promise.resolve(ok(undefined));
		}),
		getActiveDocumentUri: vi.fn().mockReturnValue(ok({ path: '/test.md' })),
		getActiveDocument: vi.fn().mockImplementation(() =>
			ok({
				uri: { path: '/test.md' },
				text: content,
				languageId: 'markdown',
				lineCount: content.split('\n').length,
			}),
		),
		openAndGetText: vi.fn().mockResolvedValue(ok(content)),
		deps: {},
	} as unknown as VscodeDocumentClient;

	return {
		client,
		getContent: () => content,
	};
};

/**
 * ConfigProviderのモックを作成する
 */
const createMockConfigProvider = (
	overrides: Partial<typeof DEFAULT_CONFIG> = {},
): ConfigProvider => ({
	getConfig: vi.fn().mockResolvedValue({ ...DEFAULT_CONFIG, ...overrides }),
	get: vi.fn(),
});

describe('ユースケース統合テスト', () => {
	describe('GetTasksUseCase + MarkdownTaskRepository', () => {
		it('Markdownファイルからタスク一覧を取得できる', async () => {
			const markdown = `# プロジェクト
- [ ] タスク1
- [x] タスク2
  - status: done`;

			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			const tasks = result._unsafeUnwrap();
			expect(tasks).toHaveLength(2);
			expect(tasks[0].title).toBe('タスク1');
			expect(tasks[0].status.value).toBe('todo');
			expect(tasks[1].title).toBe('タスク2');
			expect(tasks[1].status.value).toBe('done');
		});

		it('空のMarkdownファイルでも正しく動作する', async () => {
			const { client } = createMockDocumentClient('');
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(0);
		});

		it('パス指定でタスクをフィルタリングできる', async () => {
			const markdown = `# 仕事
- [ ] 仕事タスク

# 個人
- [ ] 個人タスク`;

			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.executeByPath(Path.create(['仕事']));

			expect(result.isOk()).toBe(true);
			const tasks = result._unsafeUnwrap();
			expect(tasks).toHaveLength(1);
			expect(tasks[0].title).toBe('仕事タスク');
		});
	});

	describe('CreateTaskUseCase + MarkdownTaskRepository', () => {
		it('新しいタスクを作成してMarkdownに反映できる', async () => {
			const markdown = '# プロジェクト';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const configProvider = createMockConfigProvider();
			const useCase = new CreateTaskUseCase(repository, configProvider);

			const result = await useCase.execute({
				title: '新しいタスク',
				path: Path.create(['プロジェクト']),
			});

			expect(result.isOk()).toBe(true);
			const task = result._unsafeUnwrap();
			expect(task.title).toBe('新しいタスク');
			expect(task.status.value).toBe('todo');

			// Markdownに反映されていることを確認
			const updatedContent = getContent();
			expect(updatedContent).toContain('[ ] 新しいタスク');
			expect(updatedContent).toContain('status: todo');
		});

		it('完了ステータスで作成するとチェックボックスがつく', async () => {
			const markdown = '';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
			});
			// MarkdownTaskRepositoryにもConfigProviderを渡す（doneStatuses連動に必要）
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);
			const useCase = new CreateTaskUseCase(repository, configProvider);

			const result = await useCase.execute({
				title: '完了タスク',
				path: Path.create([]),
				status: Status.create('done')._unsafeUnwrap(),
			});

			expect(result.isOk()).toBe(true);
			const updatedContent = getContent();
			expect(updatedContent).toContain('[x] 完了タスク');
		});

		it('ルートにタスクを作成できる', async () => {
			const markdown = '';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const configProvider = createMockConfigProvider();
			const useCase = new CreateTaskUseCase(repository, configProvider);

			const result = await useCase.execute({
				title: 'ルートタスク',
				path: Path.create([]),
			});

			expect(result.isOk()).toBe(true);
			expect(getContent()).toContain('[ ] ルートタスク');
		});
	});

	describe('UpdateTaskUseCase + MarkdownTaskRepository', () => {
		it('タスクのタイトルを更新できる', async () => {
			const markdown = '- [ ] 古いタイトル';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new UpdateTaskUseCase(repository);

			const result = await useCase.execute({
				id: '（ルート）::古いタイトル',
				title: '新しいタイトル',
			});

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().title).toBe('新しいタイトル');

			const updatedContent = getContent();
			expect(updatedContent).toContain('新しいタイトル');
			expect(updatedContent).not.toContain('古いタイトル');
		});

		it('複数タスクを連続更新しても整合性が保たれる', async () => {
			const markdown = `- [ ] タスク1
- [ ] タスク2
- [ ] タスク3`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new UpdateTaskUseCase(repository);

			// 連続更新
			await useCase.execute({ id: '（ルート）::タスク1', title: '更新タスク1' });
			await useCase.execute({ id: '（ルート）::タスク2', title: '更新タスク2' });
			await useCase.execute({ id: '（ルート）::タスク3', title: '更新タスク3' });

			const updatedContent = getContent();
			expect(updatedContent).toContain('更新タスク1');
			expect(updatedContent).toContain('更新タスク2');
			expect(updatedContent).toContain('更新タスク3');
			expect(updatedContent).not.toContain('- [ ] タスク1');
		});

		it('存在しないタスクを更新しようとするとエラー', async () => {
			const markdown = '- [ ] タスク1';
			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new UpdateTaskUseCase(repository);

			const result = await useCase.execute({
				id: '（ルート）::存在しない',
				title: '新しいタイトル',
			});

			expect(result.isErr()).toBe(true);
		});
	});

	describe('DeleteTaskUseCase + MarkdownTaskRepository', () => {
		it('タスクを削除できる', async () => {
			const markdown = `- [ ] タスク1
- [ ] タスク2`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new DeleteTaskUseCase(repository);

			const result = await useCase.execute('（ルート）::タスク1');

			expect(result.isOk()).toBe(true);

			const updatedContent = getContent();
			expect(updatedContent).not.toContain('タスク1');
			expect(updatedContent).toContain('タスク2');
		});

		it('子要素付きタスクを削除できる', async () => {
			const markdown = `- [ ] タスク1
  - status: todo
  - priority: high
- [ ] タスク2`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new DeleteTaskUseCase(repository);

			const result = await useCase.execute('（ルート）::タスク1');

			expect(result.isOk()).toBe(true);

			const updatedContent = getContent();
			expect(updatedContent).not.toContain('タスク1');
			expect(updatedContent).not.toContain('priority: high');
			expect(updatedContent).toContain('タスク2');
		});

		it('存在しないタスクを削除しようとするとエラー', async () => {
			const markdown = '- [ ] タスク1';
			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new DeleteTaskUseCase(repository);

			const result = await useCase.execute('（ルート）::存在しない');

			expect(result.isErr()).toBe(true);
		});
	});

	describe('ChangeTaskStatusUseCase + MarkdownTaskRepository', () => {
		it('ステータス変更時にチェックボックスが連動する', async () => {
			const markdown = '- [ ] タスク1';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
				syncCheckboxWithDone: true,
			});
			// MarkdownTaskRepositoryにもConfigProviderを渡す（doneStatuses連動に必要）
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);
			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);

			const doneStatus = Status.create('done')._unsafeUnwrap();
			const result = await useCase.execute('（ルート）::タスク1', doneStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(true);

			const updatedContent = getContent();
			expect(updatedContent).toContain('[x]');
		});

		it('doneから他のステータスに変更するとチェックボックスが外れる', async () => {
			const markdown = `- [x] 完了タスク
  - status: done`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
				syncCheckboxWithDone: true,
			});
			// MarkdownTaskRepositoryにもConfigProviderを渡す（doneStatuses連動に必要）
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);
			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);

			const todoStatus = Status.create('todo')._unsafeUnwrap();
			const result = await useCase.execute('（ルート）::完了タスク', todoStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(false);

			const updatedContent = getContent();
			expect(updatedContent).toContain('[ ]');
		});

		it('syncCheckboxWithDoneがfalseの場合はチェックボックスを変更しない', async () => {
			const markdown = '- [ ] タスク1';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
				syncCheckboxWithDone: false,
			});
			// MarkdownTaskRepositoryにもConfigProviderを渡す（syncCheckboxWithDone=falseなのでチェックボックスは変更されない）
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);
			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);

			const doneStatus = Status.create('done')._unsafeUnwrap();
			const result = await useCase.execute('（ルート）::タスク1', doneStatus);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap().isChecked).toBe(false);

			// ステータスは更新されるがチェックボックスはそのまま
			const updatedContent = getContent();
			expect(updatedContent).toContain('[ ]');
			expect(updatedContent).toContain('status: done');
		});

		it('存在しないタスクのステータスを変更しようとするとエラー', async () => {
			const markdown = '- [ ] タスク1';
			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const configProvider = createMockConfigProvider();
			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);

			const result = await useCase.execute(
				'（ルート）::存在しない',
				Status.create('done')._unsafeUnwrap(),
			);

			expect(result.isErr()).toBe(true);
		});
	});

	describe('エッジケーステスト', () => {
		it('日本語タイトルのタスクを正しく操作できる', async () => {
			const markdown = `# プロジェクト管理
- [ ] 日本語タスク：設計書作成
- [ ] ミーティング準備（重要）`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new UpdateTaskUseCase(repository);

			const result = await useCase.execute({
				id: 'プロジェクト管理::日本語タスク：設計書作成',
				title: '日本語タスク：設計書作成【完了】',
			});

			expect(result.isOk()).toBe(true);
			const updatedContent = getContent();
			expect(updatedContent).toContain('日本語タスク：設計書作成【完了】');
		});

		it('Markdownリンクを含むタスクを正しく操作できる', async () => {
			const markdown = '- [ ] [ドキュメント](https://example.com)を読む';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
				syncCheckboxWithDone: true,
			});
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);
			const useCase = new ChangeTaskStatusUseCase(repository, configProvider);

			const result = await useCase.execute(
				'（ルート）::[ドキュメント](https://example.com)を読む',
				Status.create('done')._unsafeUnwrap(),
			);

			expect(result.isOk()).toBe(true);
			const updatedContent = getContent();
			expect(updatedContent).toContain('[x]');
			expect(updatedContent).toContain('[ドキュメント](https://example.com)を読む');
		});

		it('太字・インラインコードを含むタスクを正しく操作できる', async () => {
			const markdown = '- [ ] **重要**: `API`の実装';
			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			const tasks = result._unsafeUnwrap();
			expect(tasks).toHaveLength(1);
			expect(tasks[0].title).toBe('**重要**: `API`の実装');
		});

		it('深くネストした見出し構造でタスクを操作できる', async () => {
			const markdown = `# レベル1
## レベル2
### レベル3
#### レベル4
- [ ] 深いタスク`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const deleteUseCase = new DeleteTaskUseCase(repository);

			const result = await deleteUseCase.execute(
				'レベル1 / レベル2 / レベル3 / レベル4::深いタスク',
			);

			expect(result.isOk()).toBe(true);
			expect(getContent()).not.toContain('深いタスク');
		});

		it('コロンを含むタスクタイトルを正しく操作できる', async () => {
			const markdown = '- [ ] タスク: サブタスク: 詳細';
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new UpdateTaskUseCase(repository);

			const result = await useCase.execute({
				id: '（ルート）::タスク: サブタスク: 詳細',
				title: 'タスク: サブタスク: 詳細 - 更新済み',
			});

			expect(result.isOk()).toBe(true);
			expect(getContent()).toContain('タスク: サブタスク: 詳細 - 更新済み');
		});

		it('大量のタスクを含むMarkdownでも正しく動作する', async () => {
			// 50個のタスクを含むMarkdownを生成
			const tasks = Array.from({ length: 50 }, (_, i) => `- [ ] タスク${i + 1}`);
			const markdown = `# プロジェクト\n${tasks.join('\n')}`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(50);

			// 中間のタスクを更新
			const updateUseCase = new UpdateTaskUseCase(repository);
			const updateResult = await updateUseCase.execute({
				id: 'プロジェクト::タスク25',
				title: 'タスク25 - 更新済み',
			});

			expect(updateResult.isOk()).toBe(true);
			expect(getContent()).toContain('タスク25 - 更新済み');
			// 他のタスクは影響を受けない
			expect(getContent()).toContain('- [ ] タスク24');
			expect(getContent()).toContain('- [ ] タスク26');
		});

		it('引用とコードブロックを含むMarkdownでも正しくタスクを認識する', async () => {
			const markdown = `# ドキュメント

> 引用テキスト
> - [ ] 引用内（タスクとして認識されない）

\`\`\`markdown
- [ ] コードブロック内（タスクとして認識されない）
\`\`\`

- [ ] 通常のタスク`;
			const { client } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const repository = new MarkdownTaskRepository(markdownClient, client);
			const useCase = new GetTasksUseCase(repository);

			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			const tasks = result._unsafeUnwrap();
			// 引用とコードブロック内のチェックボックスは無視される
			expect(tasks).toHaveLength(1);
			expect(tasks[0].title).toBe('通常のタスク');
		});

		it('連続した編集操作を行っても整合性が保たれる', async () => {
			const markdown = `# プロジェクト
- [ ] タスクA
- [ ] タスクB
- [ ] タスクC`;
			const { client, getContent } = createMockDocumentClient(markdown);
			const markdownClient = new MarkdownTaskClient();
			const configProvider = createMockConfigProvider({
				doneStatuses: ['done'],
				syncCheckboxWithDone: true,
			});
			const repository = new MarkdownTaskRepository(markdownClient, client, configProvider);

			// 作成 → 更新 → ステータス変更 → 削除 の連続操作
			const createUseCase = new CreateTaskUseCase(repository, configProvider);
			await createUseCase.execute({
				title: '新規タスク',
				path: Path.create(['プロジェクト']),
			});

			const updateUseCase = new UpdateTaskUseCase(repository);
			await updateUseCase.execute({
				id: 'プロジェクト::タスクA',
				title: 'タスクA（更新）',
			});

			const changeStatusUseCase = new ChangeTaskStatusUseCase(repository, configProvider);
			await changeStatusUseCase.execute(
				'プロジェクト::タスクB',
				Status.create('done')._unsafeUnwrap(),
			);

			const deleteUseCase = new DeleteTaskUseCase(repository);
			await deleteUseCase.execute('プロジェクト::タスクC');

			const finalContent = getContent();
			expect(finalContent).toContain('新規タスク');
			expect(finalContent).toContain('タスクA（更新）');
			expect(finalContent).toContain('[x] タスクB');
			expect(finalContent).not.toContain('タスクC');
		});
	});
});
