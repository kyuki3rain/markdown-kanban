import * as fs from 'node:fs';
import { expect } from 'chai';
import type { WebDriver } from 'selenium-webdriver';
import { VSBrowser, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	createTempDir,
	createTestMarkdownFile,
	DEFAULT_TEST_MARKDOWN,
	getTaskCountInColumnByDriver,
	sleep,
	switchBackFromWebView,
	switchToWebViewFrame,
	waitForKanbanBoardByDriver,
} from './utils/testHelper';

describe('Sync Tests', function () {
	// タイムアウトを長めに設定（VSCode起動 + WebDriver操作 + ファイル同期）
	this.timeout(120000);

	let browser: VSBrowser;
	let workbench: Workbench;
	let driver: WebDriver;
	let tempDir: string;

	before(async () => {
		browser = VSBrowser.instance;
		driver = browser.driver;
		workbench = new Workbench();
		tempDir = createTempDir();
	});

	after(async () => {
		if (tempDir) {
			cleanupTempDir(tempDir);
		}
	});

	afterEach(async () => {
		await switchBackFromWebView(driver);
		try {
			const editorView = workbench.getEditorView();
			await editorView.closeAllEditors();
		} catch {
			// エディタが存在しない場合は無視
		}
	});

	describe('Editor to WebView Sync', () => {
		let filePath: string;

		beforeEach(async () => {
			filePath = createTestMarkdownFile(tempDir, 'sync-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);
		});

		it('should reflect task addition in external editor', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');

			// WebViewから抜けてファイルを直接編集
			await switchBackFromWebView(driver);

			// ファイルに新しいタスクを追加
			const currentContent = fs.readFileSync(filePath, 'utf-8');
			const newContent = `${currentContent}\n- [ ] New external task\n  - status: todo\n`;
			fs.writeFileSync(filePath, newContent, 'utf-8');

			// ファイルの変更がVSCodeに反映されるまで待機
			await sleep(2000);

			// WebViewに戻って確認
			await switchToWebViewFrame(driver, 10000);
			await sleep(2000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount + 1);
		});

		it('should reflect task status change in external editor', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const initialInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			// WebViewから抜けてファイルを直接編集
			await switchBackFromWebView(driver);

			// ファイル内のステータスを変更（Feature 1のstatusをin-progressに）
			const currentContent = fs.readFileSync(filePath, 'utf-8');
			const newContent = currentContent.replace(
				'- [ ] Feature 1\n  - status: todo',
				'- [ ] Feature 1\n  - status: in-progress',
			);
			fs.writeFileSync(filePath, newContent, 'utf-8');

			// ファイルの変更がVSCodeに反映されるまで待機
			await sleep(2000);

			// WebViewに戻って確認
			await switchToWebViewFrame(driver, 10000);
			await sleep(2000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const finalInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalInProgressCount).to.equal(initialInProgressCount + 1);
		});

		it('should reflect task deletion in external editor', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');

			// WebViewから抜けてファイルを直接編集
			await switchBackFromWebView(driver);

			// ファイルからタスクを削除（Feature 1を削除）
			const currentContent = fs.readFileSync(filePath, 'utf-8');
			const newContent = currentContent.replace('- [ ] Feature 1\n  - status: todo\n', '');
			fs.writeFileSync(filePath, newContent, 'utf-8');

			// ファイルの変更がVSCodeに反映されるまで待機
			await sleep(2000);

			// WebViewに戻って確認
			await switchToWebViewFrame(driver, 10000);
			await sleep(2000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount - 1);
		});

		it('should reflect checkbox toggle in external editor', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const initialDoneCount = await getTaskCountInColumnByDriver(driver, 'done');

			// WebViewから抜けてファイルを直接編集
			await switchBackFromWebView(driver);

			// ファイル内のチェックボックスをトグル（Feature 1を完了に）
			const currentContent = fs.readFileSync(filePath, 'utf-8');
			const newContent = currentContent.replace(
				'- [ ] Feature 1\n  - status: todo',
				'- [x] Feature 1\n  - status: done',
			);
			fs.writeFileSync(filePath, newContent, 'utf-8');

			// ファイルの変更がVSCodeに反映されるまで待機
			await sleep(2000);

			// WebViewに戻って確認
			await switchToWebViewFrame(driver, 10000);
			await sleep(2000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const finalDoneCount = await getTaskCountInColumnByDriver(driver, 'done');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalDoneCount).to.equal(initialDoneCount + 1);
		});
	});
});
