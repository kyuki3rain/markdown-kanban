import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		exclude: ['node_modules'],
		setupFiles: ['./src/test/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
			include: ['src/**/*.ts', 'src/**/*.tsx'],
			exclude: [
				'src/test/**/*',
				'src/**/*.test.ts',
				'src/**/*.test.tsx',
				'src/main.tsx',
			],
			thresholds: {
				statements: 80,
				branches: 70,
				functions: 85,
				lines: 80,
			},
		},
	},
});
