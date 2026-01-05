import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { By, until, type WebDriver, type WebElement } from 'selenium-webdriver';
import type { WebView, Workbench } from 'vscode-extension-tester';

/**
 * テスト用のテンポラリディレクトリを作成
 */
export function createTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'md-tasks-test-'));
}

/**
 * テスト用のMarkdownファイルを作成
 */
export function createTestMarkdownFile(dir: string, filename: string, content: string): string {
	const filePath = path.join(dir, filename);
	fs.writeFileSync(filePath, content, 'utf-8');
	return filePath;
}

/**
 * テンポラリディレクトリを削除
 */
export function cleanupTempDir(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * WebView内の要素を待機して取得
 */
export async function waitForElement(
	webview: WebView,
	testId: string,
	timeout = 10000,
): Promise<WebElement> {
	const driver = webview.getDriver();
	const locator = By.css(`[data-testid="${testId}"]`);
	await driver.wait(until.elementLocated(locator), timeout);
	return webview.findWebElement(locator);
}

/**
 * WebView内の複数要素を取得
 */
export async function findElements(webview: WebView, testId: string): Promise<WebElement[]> {
	const locator = By.css(`[data-testid="${testId}"]`);
	return webview.findWebElements(locator);
}

/**
 * WebView内の要素をクリック
 */
export async function clickElement(webview: WebView, testId: string): Promise<void> {
	const element = await waitForElement(webview, testId);
	await element.click();
}

/**
 * WebView内の入力フィールドに値を設定
 */
export async function setInputValue(
	webview: WebView,
	testId: string,
	value: string,
): Promise<void> {
	const element = await waitForElement(webview, testId);
	await element.clear();
	await element.sendKeys(value);
}

/**
 * WebView内のセレクトボックスの値を設定
 */
export async function setSelectValue(
	webview: WebView,
	testId: string,
	value: string,
): Promise<void> {
	const element = await waitForElement(webview, testId);
	// セレクトボックスのオプションを選択
	const option = await element.findElement(By.css(`option[value="${value}"]`));
	await option.click();
}

/**
 * 要素のテキストを取得
 */
export async function getElementText(webview: WebView, testId: string): Promise<string> {
	const element = await waitForElement(webview, testId);
	return element.getText();
}

/**
 * 要素が存在するかチェック
 */
export async function elementExists(webview: WebView, testId: string): Promise<boolean> {
	try {
		const elements = await findElements(webview, testId);
		return elements.length > 0;
	} catch {
		return false;
	}
}

/**
 * 指定したミリ秒待機
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * カンバンボードが表示されるまで待機
 */
export async function waitForKanbanBoard(webview: WebView, timeout = 15000): Promise<void> {
	await waitForElement(webview, 'kanban-board', timeout);
}

/**
 * 特定のカラムに含まれるタスク数を取得
 */
export async function getTaskCountInColumn(webview: WebView, status: string): Promise<number> {
	const text = await getElementText(webview, `column-count-${status}`);
	return Number.parseInt(text, 10);
}

/**
 * 特定のカラムに含まれるタスクカード要素を取得
 */
export async function getTaskCardsInColumn(
	webview: WebView,
	status: string,
): Promise<WebElement[]> {
	const taskList = await waitForElement(webview, `task-list-${status}`);
	return taskList.findElements(By.css('[data-testid^="task-card-"]'));
}

/**
 * ドラッグ&ドロップを実行
 */
export async function dragAndDrop(
	driver: WebDriver,
	source: WebElement,
	target: WebElement,
): Promise<void> {
	const actions = driver.actions({ async: true });
	await actions.dragAndDrop(source, target).perform();
}

/**
 * エディタでMarkdownコンテンツを取得
 * Note: vscode-extension-testerのEditorクラスはgetTextメソッドを持たない場合がある
 * その場合はVSCode APIを直接使用する必要がある
 */
export async function getEditorContent(_workbench: Workbench): Promise<string> {
	// 現時点では未実装
	return '';
}

/**
 * デフォルトのテスト用Markdownコンテンツ
 */
export const DEFAULT_TEST_MARKDOWN = `# Test Project

## Features
- [ ] Feature 1
  - status: todo
- [ ] Feature 2
  - status: in-progress
- [x] Feature 3
  - status: done

## Bugs
- [ ] Bug fix 1
  - status: todo
`;

/**
 * フロントマター付きのテスト用Markdownコンテンツ
 */
export const FRONTMATTER_TEST_MARKDOWN = `---
kanban:
  statuses:
    - backlog
    - doing
    - review
    - done
  doneStatuses:
    - done
  defaultStatus: backlog
---

# Custom Kanban

- [ ] Task 1
  - status: backlog
- [ ] Task 2
  - status: doing
`;
