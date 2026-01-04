import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

// IPCソケットのパス長制限（103文字）を回避するため、短いパスを使用
const tmpDir = path.join(os.tmpdir(), 'vscode-test-md-tasks');

export default defineConfig({
	files: '../../out/test/**/*.test.js',
	// 拡張機能のルートディレクトリを指定
	extensionDevelopmentPath: '../..',
	// 短いパスを使用してIPCソケットのパス長制限を回避
	launchArgs: [
		`--user-data-dir=${tmpDir}/user-data`,
		`--extensions-dir=${tmpDir}/extensions`,
	],
});
