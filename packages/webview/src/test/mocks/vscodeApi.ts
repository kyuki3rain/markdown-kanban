import { vi } from 'vitest';
import type { ExtensionToWebViewMessage, WebViewToExtensionMessage } from '../../types';

export interface MockVsCodeApi {
	postMessage: ReturnType<typeof vi.fn>;
	getState: ReturnType<typeof vi.fn>;
	setState: ReturnType<typeof vi.fn>;
}

let mockVsCodeApi: MockVsCodeApi;
let messageListeners: ((event: MessageEvent<ExtensionToWebViewMessage>) => void)[] = [];

/**
 * Create a fresh mock VS Code API
 */
export function createMockVsCodeApi(): MockVsCodeApi {
	return {
		postMessage: vi.fn<[WebViewToExtensionMessage], void>(),
		getState: vi.fn().mockReturnValue(null),
		setState: vi.fn(),
	};
}

/**
 * Setup the global acquireVsCodeApi mock
 */
export function setupVsCodeApiMock(): void {
	mockVsCodeApi = createMockVsCodeApi();
	messageListeners = [];

	// Mock acquireVsCodeApi global function
	(globalThis as unknown as { acquireVsCodeApi: () => MockVsCodeApi }).acquireVsCodeApi = () =>
		mockVsCodeApi;
}

/**
 * Get the current mock VS Code API instance
 */
export function getMockVsCodeApi(): MockVsCodeApi {
	return mockVsCodeApi;
}

/**
 * Reset the mock VS Code API (call in beforeEach)
 */
export function resetMockVsCodeApi(): void {
	mockVsCodeApi = createMockVsCodeApi();
	messageListeners = [];
	(globalThis as unknown as { acquireVsCodeApi: () => MockVsCodeApi }).acquireVsCodeApi = () =>
		mockVsCodeApi;
}

/**
 * Simulate a message from the Extension to WebView
 */
export function simulateExtensionMessage(message: ExtensionToWebViewMessage): void {
	const event = new MessageEvent('message', { data: message });
	for (const listener of messageListeners) {
		listener(event);
	}
	// Also dispatch to window for real event listeners
	window.dispatchEvent(event);
}

/**
 * Assert that a specific message was posted to the Extension
 */
export function expectMessagePosted(expectedMessage: WebViewToExtensionMessage): void {
	expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith(expectedMessage);
}

/**
 * Register a message listener (used by useVscodeMessage hook)
 */
export function registerMessageListener(
	listener: (event: MessageEvent<ExtensionToWebViewMessage>) => void,
): void {
	messageListeners.push(listener);
}

/**
 * Unregister a message listener
 */
export function unregisterMessageListener(
	listener: (event: MessageEvent<ExtensionToWebViewMessage>) => void,
): void {
	messageListeners = messageListeners.filter((l) => l !== listener);
}
