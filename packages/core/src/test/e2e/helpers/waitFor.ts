/**
 * 指定されたミリ秒だけ待機する
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 条件が満たされるまで待機する
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	options: { timeout?: number; interval?: number } = {},
): Promise<void> {
	const { timeout = 5000, interval = 100 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return;
		}
		await sleep(interval);
	}

	throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * 指定された値が返されるまで待機する
 */
export async function waitForValue<T>(
	getValue: () => T | Promise<T>,
	predicate: (value: T) => boolean,
	options: { timeout?: number; interval?: number } = {},
): Promise<T> {
	const { timeout = 5000, interval = 100 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const value = await getValue();
		if (predicate(value)) {
			return value;
		}
		await sleep(interval);
	}

	throw new Error(`Timeout waiting for value after ${timeout}ms`);
}
