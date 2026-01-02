import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

suite('Extension Activation', () => {
	test('Markdownファイルを開くとExtensionがアクティベートされる', async () => {
		// Markdownファイルを作成して開く
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1',
		});
		await vscode.window.showTextDocument(doc);

		// Extensionがアクティベートされるまで少し待つ
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);
		assert.strictEqual(
			extension.isActive,
			true,
			'Extension should be active after opening a Markdown file',
		);
	});

	test('アクティベート後に必要なコマンドが登録されている', async () => {
		// Extensionがアクティベートされていることを前提とする
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		if (!extension.isActive) {
			await extension.activate();
		}

		// 登録されているコマンド一覧を取得
		const commands = await vscode.commands.getCommands(true);

		// 必要なコマンドが登録されていることを確認
		assert.ok(
			commands.includes('mdTasks.openBoard'),
			'mdTasks.openBoard command should be registered',
		);
		assert.ok(
			commands.includes('mdTasks.openBoardFromEditor'),
			'mdTasks.openBoardFromEditor command should be registered',
		);
	});
});
