import { expect } from 'chai';
import { By } from 'selenium-webdriver';
import { VSBrowser, type WebView, Workbench } from 'vscode-extension-tester';
import {
	cleanupTempDir,
	clickElement,
	createTempDir,
	createTestMarkdownFile,
	DEFAULT_TEST_MARKDOWN,
	elementExists,
	FRONTMATTER_TEST_MARKDOWN,
	getElementText,
	getTaskCardsInColumn,
	getTaskCountInColumn,
	getWebView,
	setInputValue,
	setSelectValue,
	sleep,
	waitForKanbanBoard,
} from './utils/testHelper';

describe('WebView UI Tests', function () {
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
		// クリーンアップ
		if (tempDir) {
			cleanupTempDir(tempDir);
		}
	});

	afterEach(async () => {
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

			// WebViewパネルが開いたことを確認
			const editorView = workbench.getEditorView();
			const titles = await editorView.getOpenEditorTitles();
			expect(titles.some((title) => title.includes('test.md'))).to.be.true;
		});

		it('should display kanban board title matching file name', async () => {
			const filePath = createTestMarkdownFile(tempDir, 'my-tasks.md', DEFAULT_TEST_MARKDOWN);

			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// パネルタイトルにファイル名が含まれていることを確認
			const editorView = workbench.getEditorView();
			const titles = await editorView.getOpenEditorTitles();
			expect(titles.some((title) => title.includes('my-tasks.md'))).to.be.true;
		});

		it('should reuse existing panel when opening same file again', async () => {
			const filePath = createTestMarkdownFile(tempDir, 'reuse-test.md', DEFAULT_TEST_MARKDOWN);

			await browser.openResources(filePath);
			await sleep(2000);

			// 1回目のコマンド実行
			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			const editorView = workbench.getEditorView();
			const initialTitles = await editorView.getOpenEditorTitles();
			const initialCount = initialTitles.filter((t) => t.includes('reuse-test.md')).length;

			// 2回目のコマンド実行
			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(2000);

			const finalTitles = await editorView.getOpenEditorTitles();
			const finalCount = finalTitles.filter((t) => t.includes('reuse-test.md')).length;

			// パネル数が増えていないことを確認
			expect(finalCount).to.equal(initialCount);
		});
	});

	describe('WebView Display Tests', () => {
		let webview: WebView;

		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'display-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			// WebViewを取得してフレームに切り替え
			webview = getWebView();
			await webview.switchToFrame(10000);
		});

		afterEach(async () => {
			if (webview) {
				await webview.switchBack();
			}
		});

		it('should display default status columns', async () => {
			await waitForKanbanBoard(webview);

			// デフォルトの3カラムが表示されていることを確認
			const todoColumn = await elementExists(webview, 'column-todo');
			const inProgressColumn = await elementExists(webview, 'column-in-progress');
			const doneColumn = await elementExists(webview, 'column-done');

			expect(todoColumn).to.be.true;
			expect(inProgressColumn).to.be.true;
			expect(doneColumn).to.be.true;
		});

		it('should display correct task count in each column', async () => {
			await waitForKanbanBoard(webview);

			// 各カラムのタスク数を確認
			const todoCount = await getTaskCountInColumn(webview, 'todo');
			const inProgressCount = await getTaskCountInColumn(webview, 'in-progress');
			const doneCount = await getTaskCountInColumn(webview, 'done');

			// DEFAULT_TEST_MARKDOWNの内容に基づいて確認
			// todo: Feature 1, Bug fix 1 = 2
			// in-progress: Feature 2 = 1
			// done: Feature 3 = 1
			expect(todoCount).to.equal(2);
			expect(inProgressCount).to.equal(1);
			expect(doneCount).to.equal(1);
		});

		it('should display task cards in correct columns', async () => {
			await waitForKanbanBoard(webview);

			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			const inProgressCards = await getTaskCardsInColumn(webview, 'in-progress');
			const doneCards = await getTaskCardsInColumn(webview, 'done');

			expect(todoCards.length).to.equal(2);
			expect(inProgressCards.length).to.equal(1);
			expect(doneCards.length).to.equal(1);
		});

		it('should display path badges on task cards', async () => {
			await waitForKanbanBoard(webview);

			// パスバッジを持つタスクカードが存在することを確認
			// タスクIDの形式が異なる可能性があるため、CSSセレクタで確認
			const allPathBadges = await webview.findWebElements(By.css('[data-testid^="task-path-"]'));
			expect(allPathBadges.length).to.be.greaterThan(0);
		});

		it('should display add task button in each column', async () => {
			await waitForKanbanBoard(webview);

			const todoAddBtn = await elementExists(webview, 'add-task-todo');
			const inProgressAddBtn = await elementExists(webview, 'add-task-in-progress');
			const doneAddBtn = await elementExists(webview, 'add-task-done');

			expect(todoAddBtn).to.be.true;
			expect(inProgressAddBtn).to.be.true;
			expect(doneAddBtn).to.be.true;
		});
	});

	describe('Configuration Tests', () => {
		let webview: WebView;

		afterEach(async () => {
			if (webview) {
				await webview.switchBack();
			}
		});

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

			webview = getWebView();
			await webview.switchToFrame(10000);
			await waitForKanbanBoard(webview);

			// カスタムカラムが表示されていることを確認
			const backlogColumn = await elementExists(webview, 'column-backlog');
			const doingColumn = await elementExists(webview, 'column-doing');
			const reviewColumn = await elementExists(webview, 'column-review');
			const doneColumn = await elementExists(webview, 'column-done');

			expect(backlogColumn).to.be.true;
			expect(doingColumn).to.be.true;
			expect(reviewColumn).to.be.true;
			expect(doneColumn).to.be.true;

			// デフォルトカラムが表示されていないことを確認
			const todoColumn = await elementExists(webview, 'column-todo');
			const inProgressColumn = await elementExists(webview, 'column-in-progress');

			expect(todoColumn).to.be.false;
			expect(inProgressColumn).to.be.false;
		});
	});

	describe('Modal Tests', () => {
		let webview: WebView;

		beforeEach(async () => {
			const filePath = createTestMarkdownFile(tempDir, 'modal-test.md', DEFAULT_TEST_MARKDOWN);
			await browser.openResources(filePath);
			await sleep(2000);

			await workbench.executeCommand('MD Tasks: Open Kanban Board');
			await sleep(3000);

			webview = getWebView();
			await webview.switchToFrame(10000);
			await waitForKanbanBoard(webview);
		});

		afterEach(async () => {
			if (webview) {
				await webview.switchBack();
			}
		});

		it('should open new task modal when clicking add button', async () => {
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			const modal = await elementExists(webview, 'task-modal');
			expect(modal).to.be.true;

			const modalTitle = await getElementText(webview, 'modal-title');
			expect(modalTitle).to.equal('New Task');
		});

		it('should open edit task modal when clicking task card', async () => {
			// 最初のタスクカードをクリック
			const taskCards = await webview.findWebElements(By.css('[data-testid^="task-card-"]'));
			expect(taskCards.length).to.be.greaterThan(0);

			await taskCards[0].click();
			await sleep(500);

			const modal = await elementExists(webview, 'task-modal');
			expect(modal).to.be.true;

			const modalTitle = await getElementText(webview, 'modal-title');
			expect(modalTitle).to.equal('Edit Task');
		});

		it('should close modal when clicking cancel button', async () => {
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			let modal = await elementExists(webview, 'task-modal');
			expect(modal).to.be.true;

			await clickElement(webview, 'button-cancel');
			await sleep(500);

			modal = await elementExists(webview, 'task-modal');
			expect(modal).to.be.false;
		});

		it('should create new task when filling form and submitting', async () => {
			const initialTodoCount = await getTaskCountInColumn(webview, 'todo');

			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			await setInputValue(webview, 'input-title', 'New Test Task');
			await sleep(200);

			await clickElement(webview, 'button-submit');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumn(webview, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount + 1);
		});

		it('should show delete button only in edit mode', async () => {
			// 新規作成モーダルでは削除ボタンがないことを確認
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			let deleteBtn = await elementExists(webview, 'button-delete');
			expect(deleteBtn).to.be.false;

			await clickElement(webview, 'button-cancel');
			await sleep(500);

			// 編集モーダルでは削除ボタンがあることを確認
			const taskCards = await webview.findWebElements(By.css('[data-testid^="task-card-"]'));
			await taskCards[0].click();
			await sleep(500);

			deleteBtn = await elementExists(webview, 'button-delete');
			expect(deleteBtn).to.be.true;
		});

		it('should change task status via modal and move to different column', async () => {
			const initialTodoCount = await getTaskCountInColumn(webview, 'todo');
			const initialInProgressCount = await getTaskCountInColumn(webview, 'in-progress');

			// todoカラムのタスクカードをクリック
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			await todoCards[0].click();
			await sleep(500);

			// ステータスを変更
			await setSelectValue(webview, 'select-status', 'in-progress');
			await sleep(200);

			await clickElement(webview, 'button-submit');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumn(webview, 'todo');
			const finalInProgressCount = await getTaskCountInColumn(webview, 'in-progress');

			expect(finalTodoCount).to.equal(initialTodoCount - 1);
			expect(finalInProgressCount).to.equal(initialInProgressCount + 1);
		});

		it('should delete task when clicking delete button in edit modal', async () => {
			const initialTodoCount = await getTaskCountInColumn(webview, 'todo');

			// todoカラムのタスクカードをクリック
			const todoCards = await getTaskCardsInColumn(webview, 'todo');
			expect(todoCards.length).to.be.greaterThan(0);

			await todoCards[0].click();
			await sleep(500);

			// 削除ボタンをクリック
			await clickElement(webview, 'button-delete');
			await sleep(1000);

			const finalTodoCount = await getTaskCountInColumn(webview, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount - 1);
		});
	});

	describe('Floating Actions Tests', () => {
		let webview: WebView;

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

			webview = getWebView();
			await webview.switchToFrame(10000);
			await waitForKanbanBoard(webview);
		});

		afterEach(async () => {
			if (webview) {
				await webview.switchBack();
			}
		});

		it('should not show floating actions initially', async () => {
			const floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.false;
		});

		it('should show floating actions after making changes', async () => {
			// タスクを追加して変更を加える
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			await setInputValue(webview, 'input-title', 'New Task for Dirty Test');
			await clickElement(webview, 'button-submit');
			await sleep(1000);

			const floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.true;
		});

		it('should hide floating actions after saving', async () => {
			// 変更を加える
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			await setInputValue(webview, 'input-title', 'Task to Save');
			await clickElement(webview, 'button-submit');
			await sleep(1000);

			// 保存ボタンをクリック
			await clickElement(webview, 'button-save');
			await sleep(1000);

			const floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.false;
		});

		it('should revert changes when clicking discard button', async () => {
			const initialTodoCount = await getTaskCountInColumn(webview, 'todo');

			// 変更を加える（タスクを追加）
			await clickElement(webview, 'add-task-todo');
			await sleep(500);

			await setInputValue(webview, 'input-title', 'Task to Discard');
			await clickElement(webview, 'button-submit');
			await sleep(1000);

			// タスクが追加されたことを確認
			const afterAddCount = await getTaskCountInColumn(webview, 'todo');
			expect(afterAddCount).to.equal(initialTodoCount + 1);

			// 破棄ボタンをクリック
			await clickElement(webview, 'button-discard');
			await sleep(1000);

			// タスクが元に戻っていることを確認
			const finalTodoCount = await getTaskCountInColumn(webview, 'todo');
			expect(finalTodoCount).to.equal(initialTodoCount);

			// フローティングアクションが非表示になっていることを確認
			const floatingActions = await elementExists(webview, 'floating-actions');
			expect(floatingActions).to.be.false;
		});
	});
});
