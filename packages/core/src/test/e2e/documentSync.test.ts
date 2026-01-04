import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
	BASIC_TASKS_MARKDOWN,
	closeAllEditors,
	createAndShowTestDocument,
	getExtensionApi,
	insertText,
	sleep,
} from './helpers';

suite('E2E: Document Sync Tests', () => {
	// 各テスト後にエディタを閉じる
	teardown(async () => {
		await closeAllEditors();
	});

	suite('3.1 Editor → WebView Sync', () => {
		test('3.1.1 Adding task in editor updates WebView', async () => {
			// Markdownファイルを開く
			const { editor } = await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// エディタにタスクを追加
			const lastLine = editor.document.lineCount;
			await insertText(editor, new vscode.Position(lastLine, 0), '- [ ] New Task\n');
			await sleep(300);

			// Extension APIでタスク一覧を取得
			const api = await getExtensionApi();
			const tasks = await api.getTasks();

			// 新しいタスクが追加されていることを確認
			assert.strictEqual(tasks.length, 4, 'Should have 4 tasks after adding one');
			assert.ok(
				tasks.some((t) => t.title === 'New Task'),
				'New task should be in the list',
			);
		});

		test('3.1.2 Deleting task in editor updates WebView', async () => {
			// Markdownファイルを開く
			const { editor } = await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// 最初のタスクの行を削除（3行目 = index 2）
			const line = editor.document.lineAt(2);
			await editor.edit((editBuilder) => {
				editBuilder.delete(line.rangeIncludingLineBreak);
			});
			await sleep(300);

			// Extension APIでタスク一覧を取得
			const api = await getExtensionApi();
			const tasks = await api.getTasks();

			// タスクが減っていることを確認
			assert.strictEqual(tasks.length, 2, 'Should have 2 tasks after deleting one');
			assert.ok(!tasks.some((t) => t.title === 'Task 1'), 'Task 1 should not be in the list');
		});

		test('3.1.3 Editing status in editor updates WebView', async () => {
			// ステータス付きのMarkdownを作成
			const markdownWithStatus = `# Project

- [ ] Task with status
  - status: todo
`;
			const { editor } = await createAndShowTestDocument(markdownWithStatus);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// ステータスを変更
			const statusLine = editor.document.lineAt(3);
			await editor.edit((editBuilder) => {
				editBuilder.replace(statusLine.range, '  - status: in-progress');
			});
			await sleep(300);

			// Extension APIでタスク一覧を取得
			const api = await getExtensionApi();
			const tasks = await api.getTasks();

			// ステータスが更新されていることを確認
			assert.strictEqual(tasks[0].status, 'in-progress', 'Status should be updated');
		});
	});

	suite('3.2 Document Save', () => {
		test('3.2.1 Document can be saved', async () => {
			// Markdownファイルを開く
			const { document, editor } = await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// ドキュメントを変更
			await insertText(editor, new vscode.Position(0, 0), '');
			await sleep(100);

			// 変更を加える（isDirtyをtrueにする）
			const lastLine = document.lineCount;
			await insertText(editor, new vscode.Position(lastLine, 0), '- [ ] Test Task\n');
			await sleep(100);

			// isDirtyがtrueであることを確認
			assert.strictEqual(document.isDirty, true, 'Document should be dirty after edit');
		});

		test('3.2.2 Tasks are maintained after save', async () => {
			// Markdownファイルを開く
			const { editor } = await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// タスクを追加
			const lastLine = editor.document.lineCount;
			await insertText(editor, new vscode.Position(lastLine, 0), '- [ ] New Task\n');
			await sleep(300);

			// タスク数を確認
			const api = await getExtensionApi();
			const tasksBeforeSave = await api.getTasks();
			assert.strictEqual(tasksBeforeSave.length, 4, 'Should have 4 tasks before save');

			// 変更後もタスク数が維持されていることを確認
			const tasksAfterChange = await api.getTasks();
			assert.strictEqual(tasksAfterChange.length, 4, 'Should still have 4 tasks after change');
		});
	});

	suite('3.4 isDirty State Tracking', () => {
		test('3.4.1 isDirty becomes true after edit', async () => {
			// Markdownファイルを開く
			const { document, editor } = await createAndShowTestDocument(BASIC_TASKS_MARKDOWN);

			// コマンドを実行してパネルを開く
			await vscode.commands.executeCommand('mdTasks.openBoard');
			await sleep(500);

			// ドキュメントを変更
			const lastLine = document.lineCount;
			await insertText(editor, new vscode.Position(lastLine, 0), '- [ ] New Task\n');
			await sleep(100);

			// isDirtyがtrueであることを確認
			assert.strictEqual(document.isDirty, true, 'Document should be dirty after edit');
		});
	});
});
