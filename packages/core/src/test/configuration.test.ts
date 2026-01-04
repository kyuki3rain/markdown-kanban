import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'kyuki3rain.md-tasks';

suite('Configuration Tests', () => {
	// 各テスト前にExtensionをアクティベート＆設定をリセット
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(extension, `Extension ${EXTENSION_ID} should be found`);

		if (!extension.isActive) {
			await extension.activate();
		}

		// 設定をデフォルトにリセット
		const config = vscode.workspace.getConfiguration('mdTasks');
		await config.update('statuses', undefined, vscode.ConfigurationTarget.Global);
	});

	// 各テスト後に設定をクリーンアップ
	teardown(async () => {
		const config = vscode.workspace.getConfiguration('mdTasks');
		await config.update('statuses', undefined, vscode.ConfigurationTarget.Global);
		await config.update('doneStatuses', undefined, vscode.ConfigurationTarget.Global);
		await config.update('defaultStatus', undefined, vscode.ConfigurationTarget.Global);
		await config.update('defaultDoneStatus', undefined, vscode.ConfigurationTarget.Global);
		await config.update('sortBy', undefined, vscode.ConfigurationTarget.Global);
		await config.update('syncCheckboxWithDone', undefined, vscode.ConfigurationTarget.Global);
	});

	test('デフォルト設定値が正しく読み込まれる', () => {
		const config = vscode.workspace.getConfiguration('mdTasks');

		// statuses のデフォルト値
		const statuses = config.get<string[]>('statuses');
		assert.deepStrictEqual(
			statuses,
			['todo', 'in-progress', 'done'],
			'Default statuses should be ["todo", "in-progress", "done"]',
		);

		// doneStatuses のデフォルト値
		const doneStatuses = config.get<string[]>('doneStatuses');
		assert.deepStrictEqual(doneStatuses, ['done'], 'Default doneStatuses should be ["done"]');

		// defaultStatus のデフォルト値
		const defaultStatus = config.get<string>('defaultStatus');
		assert.strictEqual(defaultStatus, 'todo', 'Default defaultStatus should be "todo"');

		// defaultDoneStatus のデフォルト値
		const defaultDoneStatus = config.get<string>('defaultDoneStatus');
		assert.strictEqual(defaultDoneStatus, 'done', 'Default defaultDoneStatus should be "done"');

		// sortBy のデフォルト値
		const sortBy = config.get<string>('sortBy');
		assert.strictEqual(sortBy, 'markdown', 'Default sortBy should be "markdown"');

		// syncCheckboxWithDone のデフォルト値
		const syncCheckboxWithDone = config.get<boolean>('syncCheckboxWithDone');
		assert.strictEqual(syncCheckboxWithDone, true, 'Default syncCheckboxWithDone should be true');
	});

	test('statusesのカスタム設定が反映される', async () => {
		const customStatuses = ['backlog', 'doing', 'review', 'done'];
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('statuses', customStatuses, vscode.ConfigurationTarget.Global);

		const updatedStatuses = vscode.workspace.getConfiguration('mdTasks').get<string[]>('statuses');
		assert.deepStrictEqual(updatedStatuses, customStatuses, 'Custom statuses should be applied');
	});

	test('doneStatusesのカスタム設定が反映される', async () => {
		const customDoneStatuses = ['done', 'completed', 'closed'];
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('doneStatuses', customDoneStatuses, vscode.ConfigurationTarget.Global);

		const updated = vscode.workspace.getConfiguration('mdTasks').get<string[]>('doneStatuses');
		assert.deepStrictEqual(updated, customDoneStatuses, 'Custom doneStatuses should be applied');
	});

	test('defaultStatusのカスタム設定が反映される', async () => {
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('defaultStatus', 'backlog', vscode.ConfigurationTarget.Global);

		const updated = vscode.workspace.getConfiguration('mdTasks').get<string>('defaultStatus');
		assert.strictEqual(updated, 'backlog', 'Custom defaultStatus should be applied');
	});

	test('defaultDoneStatusのカスタム設定が反映される', async () => {
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('defaultDoneStatus', 'completed', vscode.ConfigurationTarget.Global);

		const updated = vscode.workspace.getConfiguration('mdTasks').get<string>('defaultDoneStatus');
		assert.strictEqual(updated, 'completed', 'Custom defaultDoneStatus should be applied');
	});

	test('sortByのカスタム設定が反映される', async () => {
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('sortBy', 'status', vscode.ConfigurationTarget.Global);

		const updated = vscode.workspace.getConfiguration('mdTasks').get<string>('sortBy');
		assert.strictEqual(updated, 'status', 'Custom sortBy should be applied');
	});

	test('syncCheckboxWithDoneのカスタム設定が反映される', async () => {
		await vscode.workspace
			.getConfiguration('mdTasks')
			.update('syncCheckboxWithDone', false, vscode.ConfigurationTarget.Global);

		const updated = vscode.workspace
			.getConfiguration('mdTasks')
			.get<boolean>('syncCheckboxWithDone');
		assert.strictEqual(updated, false, 'Custom syncCheckboxWithDone should be applied');
	});
});
