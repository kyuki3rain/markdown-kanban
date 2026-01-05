import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { By, until, type WebDriver, type WebElement } from 'selenium-webdriver';
import { WebView, type Workbench } from 'vscode-extension-tester';

export type { WebView };

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
 * WebView内の要素を待機して取得（WebViewオブジェクト使用）
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
 * ドライバーを使って要素を待機して取得（フレーム切り替え後用）
 */
export async function waitForElementByDriver(
	driver: WebDriver,
	testId: string,
	timeout = 10000,
): Promise<WebElement> {
	const locator = By.css(`[data-testid="${testId}"]`);
	await driver.wait(until.elementLocated(locator), timeout);
	return driver.findElement(locator);
}

/**
 * WebView内の複数要素を取得（WebViewオブジェクト使用）
 */
export async function findElements(webview: WebView, testId: string): Promise<WebElement[]> {
	const locator = By.css(`[data-testid="${testId}"]`);
	return webview.findWebElements(locator);
}

/**
 * ドライバーを使って複数要素を取得
 */
export async function findElementsByDriver(
	driver: WebDriver,
	testId: string,
): Promise<WebElement[]> {
	const locator = By.css(`[data-testid="${testId}"]`);
	return driver.findElements(locator);
}

/**
 * WebView内の要素をクリック（WebViewオブジェクト使用）
 */
export async function clickElement(webview: WebView, testId: string): Promise<void> {
	const element = await waitForElement(webview, testId);
	await element.click();
}

/**
 * ドライバーを使って要素をクリック
 */
export async function clickElementByDriver(driver: WebDriver, testId: string): Promise<void> {
	const element = await waitForElementByDriver(driver, testId);
	await element.click();
}

/**
 * WebView内の入力フィールドに値を設定（WebViewオブジェクト使用）
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
 * ドライバーを使って入力フィールドに値を設定
 */
export async function setInputValueByDriver(
	driver: WebDriver,
	testId: string,
	value: string,
): Promise<void> {
	const element = await waitForElementByDriver(driver, testId);
	await element.clear();
	await element.sendKeys(value);
}

/**
 * WebView内のセレクトボックスの値を設定（WebViewオブジェクト使用）
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
 * ドライバーを使ってセレクトボックスの値を設定
 */
export async function setSelectValueByDriver(
	driver: WebDriver,
	testId: string,
	value: string,
): Promise<void> {
	const element = await waitForElementByDriver(driver, testId);
	const option = await element.findElement(By.css(`option[value="${value}"]`));
	await option.click();
}

/**
 * 要素のテキストを取得（WebViewオブジェクト使用）
 */
export async function getElementText(webview: WebView, testId: string): Promise<string> {
	const element = await waitForElement(webview, testId);
	return element.getText();
}

/**
 * ドライバーを使って要素のテキストを取得
 */
export async function getElementTextByDriver(driver: WebDriver, testId: string): Promise<string> {
	const element = await waitForElementByDriver(driver, testId);
	return element.getText();
}

/**
 * 要素が存在するかチェック（WebViewオブジェクト使用）
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
 * ドライバーを使って要素が存在するかチェック
 */
export async function elementExistsByDriver(driver: WebDriver, testId: string): Promise<boolean> {
	try {
		const elements = await findElementsByDriver(driver, testId);
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
 * カンバンボードが表示されるまで待機（WebViewオブジェクト使用）
 */
export async function waitForKanbanBoard(webview: WebView, timeout = 15000): Promise<void> {
	await waitForElement(webview, 'kanban-board', timeout);
}

/**
 * ドライバーを使ってカンバンボードが表示されるまで待機
 */
export async function waitForKanbanBoardByDriver(
	driver: WebDriver,
	timeout = 15000,
): Promise<void> {
	await waitForElementByDriver(driver, 'kanban-board', timeout);
}

/**
 * 特定のカラムに含まれるタスク数を取得（WebViewオブジェクト使用）
 */
export async function getTaskCountInColumn(webview: WebView, status: string): Promise<number> {
	const text = await getElementText(webview, `column-count-${status}`);
	return Number.parseInt(text, 10);
}

/**
 * ドライバーを使ってタスク数を取得
 */
export async function getTaskCountInColumnByDriver(
	driver: WebDriver,
	status: string,
): Promise<number> {
	const text = await getElementTextByDriver(driver, `column-count-${status}`);
	return Number.parseInt(text, 10);
}

/**
 * 特定のカラムに含まれるタスクカード要素を取得（WebViewオブジェクト使用）
 */
export async function getTaskCardsInColumn(
	webview: WebView,
	status: string,
): Promise<WebElement[]> {
	const taskList = await waitForElement(webview, `task-list-${status}`);
	return taskList.findElements(By.css('[data-testid^="task-card-"]'));
}

/**
 * ドライバーを使ってタスクカード要素を取得
 */
export async function getTaskCardsInColumnByDriver(
	driver: WebDriver,
	status: string,
): Promise<WebElement[]> {
	const taskList = await waitForElementByDriver(driver, `task-list-${status}`);
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

/**
 * WebViewパネルを取得する
 * コマンド実行後、開いているWebViewパネルを取得
 */
export function getWebView(): WebView {
	return new WebView();
}

/**
 * WebViewパネルのiframeに直接スイッチする（パネルタイプのWebView用）
 * vscode-extension-testerの標準WebViewクラスはエディタ内WebViewを想定しているため、
 * パネルタイプのWebViewには対応していない場合がある
 */
export async function switchToWebViewFrame(driver: WebDriver, timeout = 10000): Promise<void> {
	// WebViewパネルのiframeを探す
	// VSCodeのバージョンによってクラス名の形式が異なる可能性があるため、複数のセレクターを試す
	const selectors = [
		"iframe[class='webview ready']", // VSCode 1.37+
		'iframe.webview.ready', // 複数クラスとして解釈される場合
		"iframe[class*='webview']", // webviewを含むクラス
	];

	let iframes: WebElement[] = [];

	for (const selector of selectors) {
		try {
			const locator = By.css(selector);
			await driver.wait(until.elementLocated(locator), Math.floor(timeout / selectors.length));
			iframes = await driver.findElements(locator);
			if (iframes.length > 0) {
				break;
			}
		} catch {
			// 次のセレクターを試す
		}
	}

	if (iframes.length === 0) {
		throw new Error('No WebView iframe found with any selector');
	}

	// 最後に追加されたiframe（最新のWebViewパネル）を選択
	const targetIframe = iframes[iframes.length - 1];
	await driver.switchTo().frame(targetIframe);

	// WebViewの内部にはさらにネストされたiframeがある場合がある
	// active-frame というIDを持つiframeを探す
	try {
		const innerFrameLocator = By.id('active-frame');
		await driver.wait(until.elementLocated(innerFrameLocator), 5000);
		const innerFrame = await driver.findElement(innerFrameLocator);
		await driver.switchTo().frame(innerFrame);
	} catch {
		// 内部フレームがない場合は現在のフレームで続行
	}
}

/**
 * WebViewフレームから抜けてデフォルトコンテキストに戻る
 */
export async function switchBackFromWebView(driver: WebDriver): Promise<void> {
	await driver.switchTo().defaultContent();
}
