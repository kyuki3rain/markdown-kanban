import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

suite('Document Sync Tests', () => {
	// 各テスト前にExtensionをアクティベート
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		if (!extension.isActive) {
			await extension.activate();
		}
	});

	// 各テスト後にエディタをクリーンアップ
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('エディタでタスクを追加するとドキュメントが変更される', async () => {
		// Markdownファイルを開く
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1\n',
		});
		await vscode.window.showTextDocument(doc);

		const editor = vscode.window.activeTextEditor;
		assert.ok(editor, 'Editor should be active');

		// エディタでタスクを追加
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(2, 0), '- [ ] Task 2\n');
		});

		// ドキュメントが変更されていることを確認
		assert.ok(doc.isDirty, 'Document should be dirty after edit');
		assert.ok(doc.getText().includes('Task 2'), 'Document should contain new task');
	});

	test('エディタでタスクを削除するとドキュメントから消える', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1\n- [ ] Task 2\n',
		});
		await vscode.window.showTextDocument(doc);

		const editor = vscode.window.activeTextEditor;
		assert.ok(editor, 'Editor should be active');

		// 2行目（Task 1）を削除
		await editor.edit((editBuilder) => {
			const line = doc.lineAt(1);
			const rangeWithNewline = new vscode.Range(
				line.range.start,
				new vscode.Position(line.range.end.line + 1, 0),
			);
			editBuilder.delete(rangeWithNewline);
		});

		// ドキュメントが変更されていることを確認
		assert.ok(doc.isDirty, 'Document should be dirty after deletion');
		assert.ok(!doc.getText().includes('Task 1'), 'Document should not contain deleted task');
		assert.ok(doc.getText().includes('Task 2'), 'Document should still contain Task 2');
	});

	test('エディタでステータスを変更するとドキュメントに反映される', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1 <!-- @status: todo -->\n',
		});
		await vscode.window.showTextDocument(doc);

		const editor = vscode.window.activeTextEditor;
		assert.ok(editor, 'Editor should be active');

		// ステータスを変更
		await editor.edit((editBuilder) => {
			const line = doc.lineAt(1);
			const text = line.text;
			const newText = text.replace('@status: todo', '@status: in-progress');
			editBuilder.replace(line.range, newText);
		});

		// ドキュメントが変更されていることを確認
		assert.ok(doc.isDirty, 'Document should be dirty after status change');
		assert.ok(
			doc.getText().includes('@status: in-progress'),
			'Document should contain updated status',
		);
	});

	test('変更時にisDirtyがtrueになる', async () => {
		const doc = await vscode.workspace.openTextDocument({
			language: 'markdown',
			content: '# Test\n- [ ] Task 1\n',
		});
		await vscode.window.showTextDocument(doc);

		const editor = vscode.window.activeTextEditor;
		assert.ok(editor, 'Editor should be active');

		// 変更を加える
		await editor.edit((editBuilder) => {
			editBuilder.insert(new vscode.Position(2, 0), '- [ ] New Task\n');
		});

		// 変更後はisDirtyがtrueになる
		assert.ok(doc.isDirty, 'Document should be dirty after modification');
	});
});
