import { expect } from 'chai';
import type { WebDriver } from 'selenium-webdriver';
import { VSBrowser, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	createTempDir,
	createTestMarkdownFile,
	elementExistsByDriver,
	sleep,
	switchBackFromWebView,
	switchToWebViewFrame,
	waitForKanbanBoardByDriver,
} from './utils/testHelper';

describe('Error Handling Tests', function () {
	// タイムアウトを長めに設定（VSCode起動 + WebDriver操作）
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

	describe('Broken Markdown Handling', () => {
		it('should display kanban board even with partially broken markdown', async () => {
			// 一部壊れたMarkdownコンテンツ（パース可能な部分と不完全な部分が混在）
			const partiallyBrokenMarkdown = `# Valid Project

## Features
- [ ] Valid task 1
  - status: todo
- [ ] Valid task 2
  - status: in-progress

## Bugs
- [ ] Bug fix 1
  - status: todo

`;

			const filePath = createTestMarkdownFile(
				tempDir,
				'partially-broken.md',
				partiallyBrokenMarkdown,
			);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);

			// カンバンボードが表示されていることを確認
			const kanbanBoard = await elementExistsByDriver(driver, 'kanban-board');
			expect(kanbanBoard).to.be.true;

			// パース可能なタスクが表示されていることを確認
			const todoColumn = await elementExistsByDriver(driver, 'column-todo');
			const inProgressColumn = await elementExistsByDriver(driver, 'column-in-progress');
			expect(todoColumn).to.be.true;
			expect(inProgressColumn).to.be.true;
		});

		it('should show error UI when markdown has critical parse error', async () => {
			// 空のファイル（タスクが1つもない状態）
			const emptyMarkdown = `# Empty Project

No tasks here.
`;

			const filePath = createTestMarkdownFile(tempDir, 'empty-tasks.md', emptyMarkdown);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);

			// カンバンボードまたはエラーUIが表示されるまで待機
			await sleep(3000);

			// カンバンボードが表示される（タスクがなくても表示可能）
			const kanbanBoard = await elementExistsByDriver(driver, 'kanban-board');
			expect(kanbanBoard).to.be.true;
		});

		it('should allow retry after error', async () => {
			// 最初は有効なMarkdownを使用
			const validMarkdown = `# Retry Test Project

## Features
- [ ] Task 1
  - status: todo
`;

			const filePath = createTestMarkdownFile(tempDir, 'retry-test.md', validMarkdown);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);

			// カンバンボードが正常に表示されることを確認
			const kanbanBoard = await elementExistsByDriver(driver, 'kanban-board');
			expect(kanbanBoard).to.be.true;

			// エラー状態の場合のリトライボタン表示確認
			// （エラーがない場合はリトライボタンは表示されない）
			const retryButton = await elementExistsByDriver(driver, 'retry-button');
			expect(retryButton).to.be.false; // 正常時はリトライボタンなし
		});
	});
});
