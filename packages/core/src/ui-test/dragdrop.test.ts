import { expect } from 'chai';
import { By, type WebDriver } from 'selenium-webdriver';
import { VSBrowser, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	createTempDir,
	createTestMarkdownFile,
	DEFAULT_TEST_MARKDOWN,
	dragAndDrop,
	elementExistsByDriver,
	getTaskCardsInColumnByDriver,
	getTaskCountInColumnByDriver,
	sleep,
	switchBackFromWebView,
	switchToWebViewFrame,
	waitForKanbanBoardByDriver,
} from './utils/testHelper';

describe('Drag and Drop Tests', function () {
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

	describe('Status Change via Drag and Drop', () => {
		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'dnd-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);
		});

		it('should change task status when dragged to another column', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const initialInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			// todoカラムの最初のタスクカードを取得
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// in-progressカラムを取得
			const inProgressColumn = await driver.findElement(
				By.css('[data-testid="task-list-in-progress"]'),
			);

			// ドラッグ&ドロップを実行
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, inProgressColumn);
			await sleep(1000);

			// 結果を確認
			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const finalInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalInProgressCount).to.equal(initialInProgressCount + 1);
		});

		it('should show drag overlay during drag operation', async () => {
			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// ドラッグハンドルを取得
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));

			// ドラッグ開始（マウスダウンだけ）
			const actions = driver.actions({ async: true });
			await actions.move({ origin: dragHandle }).press().move({ x: 50, y: 0 }).perform();
			await sleep(500);

			// ドラッグオーバーレイが表示されていることを確認
			const overlays = await driver.findElements(By.css('[data-testid="drag-overlay"]'));
			expect(overlays.length).to.be.greaterThan(0);

			// ドラッグを終了
			await actions.release().perform();
		});

		it('should move task to done column and check checkbox', async () => {
			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// doneカラムを取得
			const doneColumn = await driver.findElement(By.css('[data-testid="task-list-done"]'));

			// ドラッグ&ドロップを実行
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, doneColumn);
			await sleep(1000);

			// doneカラムのタスク数が増えていることを確認
			const doneCards = await getTaskCardsInColumnByDriver(driver, 'done');
			expect(doneCards.length).to.be.greaterThan(1); // 元々1つあるので2つ以上
		});

		it('should set isDirty flag after drag and drop', async () => {
			// 初期状態ではFloatingActionsが表示されていないことを確認
			let floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.false;

			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// in-progressカラムを取得
			const inProgressColumn = await driver.findElement(
				By.css('[data-testid="task-list-in-progress"]'),
			);

			// ドラッグ&ドロップを実行
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, inProgressColumn);
			await sleep(1000);

			// D&D後にFloatingActionsが表示されること（isDirty = true）を確認
			floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.true;
		});
	});
});
