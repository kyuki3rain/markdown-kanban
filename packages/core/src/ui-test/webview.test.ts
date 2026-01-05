import { expect } from 'chai';
import { By, type WebDriver } from 'selenium-webdriver';
import { VSBrowser, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	clickElementByDriver,
	createTempDir,
	createTestMarkdownFile,
	DEFAULT_TEST_MARKDOWN,
	elementExistsByDriver,
	FRONTMATTER_TEST_MARKDOWN,
	getElementTextByDriver,
	getTaskCardsInColumnByDriver,
	getTaskCountInColumnByDriver,
	setInputValueByDriver,
	setSelectValueByDriver,
	sleep,
	switchBackFromWebView,
	switchToWebViewFrame,
	waitForKanbanBoardByDriver,
} from './utils/testHelper';

describe('WebView UI Tests', function () {
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
		// クリーンアップ
		if (tempDir) {
			cleanupTempDir(tempDir);
		}
	});

	afterEach(async () => {
		// フレームから抜けてデフォルトコンテキストに戻る
		await switchBackFromWebView(driver);
		// 各テスト後にエディタを閉じる
		try {
			const editorView = workbench.getEditorView();
			await editorView.closeAllEditors();
		} catch {
			// エディタが存在しない場合は無視
		}
	});

	describe('Basic Flow Tests', () => {
		it('should open WebView panel when command is executed', async () => {
			// テスト用Markdownファイルを作成
			const filePath = createTestMarkdownFile(tempDir, 'test.md', DEFAULT_TEST_MARKDOWN);

			// ファイルを開く
			await browser.openResources(filePath);
			await sleep(2000);

			// コマンドを実行してカンバンボードを開く
			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// WebViewフレームに切り替え
			await switchToWebViewFrame(driver, 10000);

			// カンバンボードが表示されていることを確認
			const kanbanBoard = await elementExistsByDriver(driver, 'kanban-board');
			expect(kanbanBoard).to.be.true;
		});

		it('should display kanban board with columns', async () => {
			const filePath = createTestMarkdownFile(tempDir, 'my-tasks.md', DEFAULT_TEST_MARKDOWN);

			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// WebViewフレームに切り替え
			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);

			// カラムが表示されていることを確認
			const todoColumn = await elementExistsByDriver(driver, 'column-todo');
			expect(todoColumn).to.be.true;
		});

		it('should reuse existing panel when opening same file again', async () => {
			const filePath = createTestMarkdownFile(tempDir, 'reuse-test.md', DEFAULT_TEST_MARKDOWN);

			await browser.openResources(filePath);
			await sleep(2000);

			// 1回目のコマンド実行
			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// WebViewフレームに切り替え
			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);

			// フレームから抜ける
			await switchBackFromWebView(driver);

			// 2回目のコマンド実行
			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(2000);

			// 再度WebViewフレームに切り替え
			await switchToWebViewFrame(driver, 10000);

			// カンバンボードが表示されていることを確認
			const kanbanBoard = await elementExistsByDriver(driver, 'kanban-board');
			expect(kanbanBoard).to.be.true;
		});
	});

	describe('WebView Display Tests', () => {
		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'display-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// WebViewフレームに切り替え
			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);
		});

		it('should display default status columns', async () => {
			// デフォルトの3カラムが表示されていることを確認
			const todoColumn = await elementExistsByDriver(driver, 'column-todo');
			const inProgressColumn = await elementExistsByDriver(driver, 'column-in-progress');
			const doneColumn = await elementExistsByDriver(driver, 'column-done');

			expect(todoColumn).to.be.true;
			expect(inProgressColumn).to.be.true;
			expect(doneColumn).to.be.true;
		});

		it('should display correct task count in each column', async () => {
			// 各カラムのタスク数を確認
			const todoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const inProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');
			const doneCount = await getTaskCountInColumnByDriver(driver, 'done');

			// DEFAULT_TEST_MARKDOWNの内容に基づいて確認
			// todo: Feature 1, Bug fix 1 = 2
			// in-progress: Feature 2 = 1
			// done: Feature 3 = 1
			expect(todoCount).to.equal(2);
			expect(inProgressCount).to.equal(1);
			expect(doneCount).to.equal(1);
		});

		it('should display task cards in correct columns', async () => {
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			const inProgressCards = await getTaskCardsInColumnByDriver(driver, 'in-progress');
			const doneCards = await getTaskCardsInColumnByDriver(driver, 'done');

			expect(todoCards.length).to.equal(2);
			expect(inProgressCards.length).to.equal(1);
			expect(doneCards.length).to.equal(1);
		});

		it('should display path badges on task cards', async () => {
			// パスバッジを持つタスクカードが存在することを確認
			const allPathBadges = await driver.findElements(By.css('[data-testid^="task-path-"]'));
			expect(allPathBadges.length).to.be.greaterThan(0);
		});

		it('should display add task button in each column', async () => {
			const todoAddBtn = await elementExistsByDriver(driver, 'add-task-todo');
			const inProgressAddBtn = await elementExistsByDriver(driver, 'add-task-in-progress');
			const doneAddBtn = await elementExistsByDriver(driver, 'add-task-done');

			expect(todoAddBtn).to.be.true;
			expect(inProgressAddBtn).to.be.true;
			expect(doneAddBtn).to.be.true;
		});
	});

	describe('Configuration Tests', () => {
		it('should display custom columns from frontmatter', async () => {
			const filePath = createTestMarkdownFile(
				tempDir,
				'frontmatter-test.md',
				FRONTMATTER_TEST_MARKDOWN,
			);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);

			// カスタムカラムが表示されていることを確認
			const backlogColumn = await elementExistsByDriver(driver, 'column-backlog');
			const doingColumn = await elementExistsByDriver(driver, 'column-doing');
			const reviewColumn = await elementExistsByDriver(driver, 'column-review');
			const doneColumn = await elementExistsByDriver(driver, 'column-done');

			expect(backlogColumn).to.be.true;
			expect(doingColumn).to.be.true;
			expect(reviewColumn).to.be.true;
			expect(doneColumn).to.be.true;

			// デフォルトカラムが表示されていないことを確認
			const todoColumn = await elementExistsByDriver(driver, 'column-todo');
			const inProgressColumn = await elementExistsByDriver(driver, 'column-in-progress');

			expect(todoColumn).to.be.false;
			expect(inProgressColumn).to.be.false;
		});
	});

	describe('Modal Tests', () => {
		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'modal-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);
		});

		it('should open new task modal when clicking add button', async () => {
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			const modal = await elementExistsByDriver(driver, 'task-modal');
			expect(modal).to.be.true;

			const modalTitle = await getElementTextByDriver(driver, 'modal-title');
			expect(modalTitle).to.equal('New Task');
		});

		it('should open edit task modal when clicking task card', async () => {
			// 最初のタスクカードをクリック
			const taskCards = await driver.findElements(By.css('[data-testid^="task-card-"]'));
			expect(taskCards.length).to.be.greaterThan(0);

			await taskCards[0].click();
			await sleep(500);

			const modal = await elementExistsByDriver(driver, 'task-modal');
			expect(modal).to.be.true;

			const modalTitle = await getElementTextByDriver(driver, 'modal-title');
			expect(modalTitle).to.equal('Edit Task');
		});

		it('should close modal when clicking cancel button', async () => {
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			let modal = await elementExistsByDriver(driver, 'task-modal');
			expect(modal).to.be.true;

			await clickElementByDriver(driver, 'button-cancel');
			await sleep(500);

			modal = await elementExistsByDriver(driver, 'task-modal');
			expect(modal).to.be.false;
		});

		it('should create new task when filling form and submitting', async () => {
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');

			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			await setInputValueByDriver(driver, 'input-title', 'New Test Task');
			await sleep(200);

			await clickElementByDriver(driver, 'button-submit');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount + 1);
		});

		it('should show delete button only in edit mode', async () => {
			// 新規作成モーダルでは削除ボタンがないことを確認
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			let deleteBtn = await elementExistsByDriver(driver, 'button-delete');
			expect(deleteBtn).to.be.false;

			await clickElementByDriver(driver, 'button-cancel');
			await sleep(500);

			// 編集モーダルでは削除ボタンがあることを確認
			const taskCards = await driver.findElements(By.css('[data-testid^="task-card-"]'));
			await taskCards[0].click();
			await sleep(500);

			deleteBtn = await elementExistsByDriver(driver, 'button-delete');
			expect(deleteBtn).to.be.true;
		});

		it('should change task status via modal and move to different column', async () => {
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const initialInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			// todoカラムのタスクカードをクリック
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			await todoCards[0].click();
			await sleep(500);

			// ステータスを変更
			await setSelectValueByDriver(driver, 'select-status', 'in-progress');
			await sleep(200);

			await clickElementByDriver(driver, 'button-submit');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			const finalInProgressCount = await getTaskCountInColumnByDriver(driver, 'in-progress');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalInProgressCount).to.equal(initialInProgressCount + 1);
		});

		it('should delete task when clicking delete button in edit modal', async () => {
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');

			// todoカラムのタスクカードをクリック
			const todoCards = await getTaskCardsInColumnByDriver(driver, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			await todoCards[0].click();
			await sleep(500);

			// 削除ボタンをクリック
			await clickElementByDriver(driver, 'button-delete');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount - 1);
		});
	});

	describe('Floating Actions Tests', () => {
		beforeEach(async () => {
			const filePath = createTestMarkdownFile(
				tempDir,
				'floating-actions-test.md',
				DEFAULT_TEST_MARKDOWN,
			);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			await switchToWebViewFrame(driver, 10000);
			await waitForKanbanBoardByDriver(driver);
		});

		it('should not show floating actions initially', async () => {
			const floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.false;
		});

		it('should show floating actions after making changes', async () => {
			// タスクを追加して変更を加える
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			await setInputValueByDriver(driver, 'input-title', 'New Task for Dirty Test');
			await clickElementByDriver(driver, 'button-submit');
			await sleep(1000);

			const floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.true;
		});

		it('should hide floating actions after saving', async () => {
			// 変更を加える
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			await setInputValueByDriver(driver, 'input-title', 'Task to Save');
			await clickElementByDriver(driver, 'button-submit');
			await sleep(1000);

			// 保存ボタンをクリック
			await clickElementByDriver(driver, 'button-save');
			await sleep(1000);

			const floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.false;
		});

		it('should revert changes when clicking discard button', async () => {
			const initialTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');

			// 変更を加える（タスクを追加）
			await clickElementByDriver(driver, 'add-task-todo');
			await sleep(500);

			await setInputValueByDriver(driver, 'input-title', 'Task to Discard');
			await clickElementByDriver(driver, 'button-submit');
			await sleep(1000);

			// タスクが追加されたことを確認
			const afterAddCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(afterAddCount).to.equal(initialTodoCount + 1);

			// 破棄ボタンをクリック
			await clickElementByDriver(driver, 'button-discard');
			await sleep(1000);

			// タスクが元に戻っていることを確認
			const finalTodoCount = await getTaskCountInColumnByDriver(driver, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount);

			// フローティングアクションが非表示になっていることを確認
			const floatingActions = await elementExistsByDriver(driver, 'floating-actions');
			expect(floatingActions).to.be.false;
		});
	});
});
