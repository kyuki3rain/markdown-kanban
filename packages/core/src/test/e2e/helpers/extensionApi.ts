import * as vscode from 'vscode';
import type { ExtensionApi } from '../../../extension';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

/**
 * 拡張機能のAPIを取得する
 */
export async function getExtensionApi(): Promise<ExtensionApi> {
	const extension = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
	if (!extension) {
		throw new Error(`Extension ${EXTENSION_ID} not found`);
	}

	if (!extension.isActive) {
		return extension.activate();
	}

	return extension.exports;
}

/**
 * 拡張機能がアクティブになるまで待機する
 */
export async function waitForExtensionActivation(): Promise<ExtensionApi> {
	const extension = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
	if (!extension) {
		throw new Error(`Extension ${EXTENSION_ID} not found`);
	}

	// 既にアクティブならそのまま返す
	if (extension.isActive) {
		return extension.exports;
	}

	// Markdownファイルを開いてアクティベーションをトリガー
	const doc = await vscode.workspace.openTextDocument({
		language: 'markdown',
		content: '# Test\n\n- [ ] Task 1\n',
	});
	await vscode.window.showTextDocument(doc);

	// アクティベーションを待機
	return extension.activate();
}
