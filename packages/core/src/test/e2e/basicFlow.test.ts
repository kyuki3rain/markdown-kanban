import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
	BASIC_TASKS_MARKDOWN,
	closeAllEditors,
	createAndShowTestDocument,
	getExtensionApi,
	sleep,
} from './helpers';

suite('E2E: Basic Flow Tests', () => {
	// 各テスト後にエディタを閉じる
	teardown(async () => {
		await closeAllEditors();
	});

	suite('1.1 Command Execution', () => {
		test('1.1.1 mdTasks.openBoard command executes successfully', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');

			// パネルが表示されるまで待機
			await sleep(500);

			// エラーが発生しなければ成功
			assert.ok(true, 'Command executed without error');
		});

		test('1.1.2 mdTasks.openBoardFromEditor command executes successfully', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoardFromEditor');

			// パネルが表示されるまで待機
			await sleep(500);

			// エラーが発生しなければ成功
			assert.ok(true, 'Command executed without error');
		});
	});

	suite('1.2 WebView Panel Display', () => {
		test('1.2.1 WebView panel is created after command execution', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');

			// パネルが表示されるまで待機
			await sleep(500);

			// Extension APIでパネルの状態を確認
			const api = await getExtensionApi();
			assert.strictEqual(api.isPanelVisible(), true, 'Panel should be visible');
		});

		test('1.2.2 Reopening panel reveals existing one', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// 最初のコマンド実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(300);

			// 2回目のコマンド実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(300);

			// パネルが表示されていることを確認
			const api = await getExtensionApi();
			assert.strictEqual(api.isPanelVisible(), true, 'Panel should still be visible');
		});
	});

	suite('1.3 Task Parsing', () => {
		test('Tasks are parsed correctly from Markdown', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIでタスク一覧を取得
			const api = await getExtensionApi();
			const tasks = await api.getTasks();

			// 3つのタスクがパースされていることを確認
			assert.strictEqual(tasks.length, 3, 'Should have 3 tasks');
			assert.strictEqual(tasks[0].title, 'Task 1', 'First task title should be "Task 1"');
			assert.strictEqual(tasks[1].title, 'Task 2', 'Second task title should be "Task 2"');
			assert.strictEqual(tasks[2].title, 'Task 3', 'Third task title should be "Task 3"');
		});

		test('Checked state is parsed correctly', async () => {
			// Markdownファイルを開く
			await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// Extension APIでタスク一覧を取得
			const api = await getExtensionApi();
			const tasks = await api.getTasks();

			// チェック状態を確認
			assert.strictEqual(tasks[0].isChecked, false, 'Task 1 should not be checked');
			assert.strictEqual(tasks[1].isChecked, false, 'Task 2 should not be checked');
			assert.strictEqual(tasks[2].isChecked, true, 'Task 3 should be checked');
		});
	});
});
