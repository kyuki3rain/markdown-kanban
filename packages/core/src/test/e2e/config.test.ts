import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
	BASIC_TASKS_MARKDOWN,
	closeAllEditors,
	createAndShowTestDocument,
	getExtensionApi,
	sleep,
	WITH_FRONTMATTER_MARKDOWN,
} from './helpers';

suite('E2E: Config Tests', () => {
	// 各テスト後にエディタを閉じる
	teardown(async () => {
		await closeAllEditors();
	});

	suite('2.1 Default Config', () => {
		test('2.1.1 Default config is loaded correctly', async () => {
			// Markdownファイルを開く（フロントマターなし）
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// デフォルト設定の確認
			assert.deepStrictEqual(
				config.statuses,
				['todo', 'in-progress', 'done'],
				'Default statuses should be ["todo", "in-progress", "done"]',
			);
			assert.deepStrictEqual(
				config.doneStatuses,
				['done'],
				'Default doneStatuses should be ["done"]',
			);
			assert.strictEqual(config.defaultStatus, 'todo', 'Default status should be "todo"');
			assert.strictEqual(config.defaultDoneStatus, 'done', 'Default done status should be "done"');
		});

		test('2.1.2 Default statuses are applied', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// 3つのステータスが存在することを確認
			assert.strictEqual(config.statuses.length, 3, 'Should have 3 statuses');
			assert.ok(config.statuses.includes('todo'), 'Should include "todo"');
			assert.ok(config.statuses.includes('in-progress'), 'Should include "in-progress"');
			assert.ok(config.statuses.includes('done'), 'Should include "done"');
		});

		test('2.1.3 Default sortBy is applied', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// sortByがmarkdownであることを確認
			assert.strictEqual(config.sortBy, 'markdown', 'Default sortBy should be "markdown"');
		});
	});

	suite('2.3 Frontmatter Config', () => {
		test('2.3.1 Frontmatter overrides statuses', async () => {
			// フロントマター付きMarkdownファイルを開く
			await createAndShowTestDocument(WITH_FRONTMATTER_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// フロントマターの設定が適用されていることを確認
			assert.deepStrictEqual(
				config.statuses,
				['backlog', 'doing', 'done'],
				'Frontmatter statuses should override default',
			);
		});

		test('2.3.2 Frontmatter overrides doneStatuses', async () => {
			// フロントマター付きMarkdownファイルを開く
			await createAndShowTestDocument(WITH_FRONTMATTER_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// フロントマターの設定が適用されていることを確認
			assert.deepStrictEqual(
				config.doneStatuses,
				['done'],
				'Frontmatter doneStatuses should be applied',
			);
		});

		test('2.3.3 Frontmatter partial override works correctly', async () => {
			// フロントマター付きMarkdownファイルを開く
			await createAndShowTestDocument(WITH_FRONTMATTER_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// 指定された項目はフロントマターの値、それ以外はデフォルト
			assert.strictEqual(
				config.defaultStatus,
				'backlog',
				'Frontmatter defaultStatus should be applied',
			);
			// sortByはフロントマターで指定されていないのでデフォルト
			assert.strictEqual(
				config.sortBy,
				'markdown',
				'sortBy should use default when not in frontmatter',
			);
		});
	});

	suite('2.4 Config Priority', () => {
		test('2.4.1 Frontmatter > VSCode settings > Default', async () => {
			// フロントマター付きMarkdownファイルを開く
			await createAndShowTestDocument(WITH_FRONTMATTER_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIで設定を取得
			const api = await getExtensionApi();
			const config = await api.getConfig();

			// フロントマターの値が優先されることを確認
			assert.deepStrictEqual(
				config.statuses,
				['backlog', 'doing', 'done'],
				'Frontmatter should have highest priority',
			);
		});
	});
});
