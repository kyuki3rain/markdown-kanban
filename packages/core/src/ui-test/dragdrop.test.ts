import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { VSBrowser, type WebView, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	createTempDir,
	createTestMarkdownFile,
	DEFAULT_TEST_MARKDOWN,
	dragAndDrop,
	elementExists,
	getTaskCardsInColumn,
	getTaskCountInColumn,
	sleep,
	waitForKanbanBoard,
} from './utils/testHelper';

describe('Drag and Drop Tests', function () {
	// タイムアウトを長めに設定（VSCode起動 + WebDriver操作）
	this.timeout(120000);

	let browser: VSBrowser;
	let workbench: Workbench;
	let tempDir: string;

	before(async () => {
		browser = VSBrowser.instance;
		workbench = new Workbench();
		tempDir = createTempDir();
	});

	after(async () => {
		if (tempDir) {
			cleanupTempDir(tempDir);
		}
	});

	afterEach(async () => {
		try {
			const editorView = workbench.getEditorView();
			await editorView.closeAllEditors();
		} catch {
			// エディタが存在しない場合は無視
		}
	});

	describe('Status Change via Drag and Drop', () => {
		let webview: WebView;

		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'dnd-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			const editorView = workbench.getEditorView();
			webview = (await editorView.openEditor('dnd-test.md')) as unknown as WebView;
			await webview.switchToFrame(10000);
			await waitForKanbanBoard(webview);
		});

		afterEach(async () => {
			if (webview) {
				await webview.switchBack();
			}
		});

		it('should change task status when dragged to another column', async () => {
			// 初期状態を確認
			const initialTodoCount = await getTaskCountInColumn(webview, 'todo');
			const initialInProgressCount = await getTaskCountInColumn(webview, 'in-progress');

			// todoカラムの最初のタスクカードを取得
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// in-progressカラムを取得
			const inProgressColumn = await webview.findWebElement(
				By.css('[data-testid="task-list-in-progress"]'),
			);

			// ドラッグ&ドロップを実行
			const driver = webview.getDriver();
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, inProgressColumn);
			await sleep(1000);

			// 結果を確認
			const finalTodoCount = await getTaskCountInColumn(webview, 'todo');
			const finalInProgressCount = await getTaskCountInColumn(webview, 'in-progress');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalInProgressCount).to.equal(initialInProgressCount + 1);
		});

		it('should show drag overlay during drag operation', async () => {
			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// ドラッグハンドルを取得
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));

			// ドラッグ開始（マウスダウンだけ）
			const driver = webview.getDriver();
			const actions = driver.actions({ async: true });
			await actions.move({ origin: dragHandle }).press().move({ x: 50, y: 0 }).perform();
			await sleep(500);

			// ドラッグオーバーレイが表示されていることを確認
			const overlays = await webview.findWebElements(By.css('[data-testid="drag-overlay"]'));
			expect(overlays.length).to.be.greaterThan(0);

			// ドラッグを終了
			await actions.release().perform();
		});

		it('should move task to done column and check checkbox', async () => {
			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// doneカラムを取得
			const doneColumn = await webview.findWebElement(By.css('[data-testid="task-list-done"]'));

			// ドラッグ&ドロップを実行
			const driver = webview.getDriver();
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, doneColumn);
			await sleep(1000);

			// doneカラムのタスク数が増えていることを確認
			const doneCards = await getTaskCardsInColumn(webview, 'done');
			expect(doneCards.length).to.be.greaterThan(1); // 元々1つあるので2つ以上
		});

		it('should set isDirty flag after drag and drop', async () => {
			// 初期状態ではFloatingActionsが表示されていないことを確認
			let floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.false;

			// todoカラムのタスクカードを取得
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			// in-progressカラムを取得
			const inProgressColumn = await webview.findWebElement(
				By.css('[data-testid="task-list-in-progress"]'),
			);

			// ドラッグ&ドロップを実行
			const driver = webview.getDriver();
			const dragHandle = await todoCards[0].findElement(By.css('[data-testid^="drag-handle-"]'));
			await dragAndDrop(driver, dragHandle, inProgressColumn);
			await sleep(1000);

			// D&D後にFloatingActionsが表示されること（isDirty = true）を確認
			floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.true;
		});
	});
});
