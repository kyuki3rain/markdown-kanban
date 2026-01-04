import * as vscode from 'vscode';

/**
 * テスト用の一時ドキュメントを作成する
 */
export async function createTestDocument(content: string): Promise<vscode.TextDocument> {
	const doc = await vscode.workspace.openTextDocument({
		language: 'markdown',
		content,
	});
	return doc;
}

/**
 * テスト用の一時ドキュメントを作成してエディタで開く
 */
export async function createAndShowTestDocument(
	content: string,
): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor }> {
	const document = await createTestDocument(content);
	const editor = await vscode.window.showTextDocument(document);
	return { document, editor };
}

/**
 * 現在開いているすべてのエディタを閉じる
 */
export async function closeAllEditors(): Promise<void> {
	await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

/**
 * ドキュメントにテキストを挿入する
 */
export async function insertText(
	editor: vscode.TextEditor,
	position: vscode.Position,
	text: string,
): Promise<boolean> {
	return editor.edit((editBuilder) => {
		editBuilder.insert(position, text);
	});
}

/**
 * ドキュメントの特定範囲を削除する
 */
export async function deleteRange(
	editor: vscode.TextEditor,
	range: vscode.Range,
): Promise<boolean> {
	return editor.edit((editBuilder) => {
		editBuilder.delete(range);
	});
}

/**
 * ドキュメントの特定行を削除する
 */
export async function deleteLine(editor: vscode.TextEditor, lineNumber: number): Promise<boolean> {
	const document = editor.document;
	const line = document.lineAt(lineNumber);
	const range = line.rangeIncludingLineBreak;
	return deleteRange(editor, range);
}

/**
 * ドキュメントの内容を置換する
 */
export async function replaceDocumentContent(
	editor: vscode.TextEditor,
	newContent: string,
): Promise<boolean> {
	const document = editor.document;
	const fullRange = new vscode.Range(
		document.positionAt(0),
		document.positionAt(document.getText().length),
	);
	return editor.edit((editBuilder) => {
		editBuilder.replace(fullRange, newContent);
	});
}
