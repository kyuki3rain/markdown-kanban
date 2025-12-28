import { describe, expect, it } from 'vitest';
import { Task } from '../../domain/entities/task';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { sortTasks } from './taskSorter';

describe('sortTasks', () => {
	const createTask = (id: string, title: string, metadata: Record<string, string> = {}): Task => {
		const status = Status.create('todo')._unsafeUnwrap();
		const path = Path.create(['Project']);
		return Task.create({
			id,
			title,
			status,
			path,
			isChecked: false,
			metadata,
		});
	};

	describe('markdown mode', () => {
		it('元の順序を維持する', () => {
			const tasks = [
				createTask('1', 'C Task'),
				createTask('2', 'A Task'),
				createTask('3', 'B Task'),
			];

			const result = sortTasks(tasks, 'markdown');

			expect(result).toEqual(tasks);
			expect(result[0].id).toBe('1');
			expect(result[1].id).toBe('2');
			expect(result[2].id).toBe('3');
		});

		it('空配列を処理できる', () => {
			const result = sortTasks([], 'markdown');

			expect(result).toEqual([]);
		});

		it('元の配列を変更しない', () => {
			const tasks = [createTask('1', 'C Task'), createTask('2', 'A Task')];
			const originalFirst = tasks[0];

			sortTasks(tasks, 'markdown');

			expect(tasks[0]).toBe(originalFirst);
		});
	});

	describe('alphabetical mode', () => {
		it('タイトルでA-Z順にソートする', () => {
			const tasks = [
				createTask('1', 'Charlie'),
				createTask('2', 'Alpha'),
				createTask('3', 'Bravo'),
			];

			const result = sortTasks(tasks, 'alphabetical');

			expect(result[0].title).toBe('Alpha');
			expect(result[1].title).toBe('Bravo');
			expect(result[2].title).toBe('Charlie');
		});

		it('大文字小文字を区別してソートする', () => {
			const tasks = [
				createTask('1', 'banana'),
				createTask('2', 'Apple'),
				createTask('3', 'cherry'),
			];

			const result = sortTasks(tasks, 'alphabetical');

			// localeCompareのデフォルト動作に依存
			expect(result.map((t) => t.title)).toEqual(['Apple', 'banana', 'cherry']);
		});

		it('日本語を正しくソートする', () => {
			const tasks = [
				createTask('1', 'さくら'),
				createTask('2', 'あさがお'),
				createTask('3', 'たんぽぽ'),
			];

			const result = sortTasks(tasks, 'alphabetical');

			expect(result[0].title).toBe('あさがお');
			expect(result[1].title).toBe('さくら');
			expect(result[2].title).toBe('たんぽぽ');
		});

		it('空配列を処理できる', () => {
			const result = sortTasks([], 'alphabetical');

			expect(result).toEqual([]);
		});

		it('元の配列を変更しない', () => {
			const tasks = [createTask('1', 'C Task'), createTask('2', 'A Task')];
			const originalFirst = tasks[0];

			sortTasks(tasks, 'alphabetical');

			expect(tasks[0]).toBe(originalFirst);
		});
	});

	describe('priority mode', () => {
		it('high > medium > low の順でソートする', () => {
			const tasks = [
				createTask('1', 'Task 1', { priority: 'low' }),
				createTask('2', 'Task 2', { priority: 'high' }),
				createTask('3', 'Task 3', { priority: 'medium' }),
			];

			const result = sortTasks(tasks, 'priority');

			expect(result[0].metadata.priority).toBe('high');
			expect(result[1].metadata.priority).toBe('medium');
			expect(result[2].metadata.priority).toBe('low');
		});

		it('優先度未設定のタスクは最後に配置する', () => {
			const tasks = [
				createTask('1', 'Task 1'),
				createTask('2', 'Task 2', { priority: 'high' }),
				createTask('3', 'Task 3', { priority: 'low' }),
			];

			const result = sortTasks(tasks, 'priority');

			expect(result[0].metadata.priority).toBe('high');
			expect(result[1].metadata.priority).toBe('low');
			expect(result[2].metadata.priority).toBeUndefined();
		});

		it('未知の優先度値は最後に配置する', () => {
			const tasks = [
				createTask('1', 'Task 1', { priority: 'unknown' }),
				createTask('2', 'Task 2', { priority: 'high' }),
			];

			const result = sortTasks(tasks, 'priority');

			expect(result[0].metadata.priority).toBe('high');
			expect(result[1].metadata.priority).toBe('unknown');
		});

		it('同一優先度のタスクは相対順序を維持する', () => {
			const tasks = [
				createTask('1', 'First High', { priority: 'high' }),
				createTask('2', 'Second High', { priority: 'high' }),
				createTask('3', 'Third High', { priority: 'high' }),
			];

			const result = sortTasks(tasks, 'priority');

			// 安定ソートであれば元の順序が維持される
			expect(result[0].id).toBe('1');
			expect(result[1].id).toBe('2');
			expect(result[2].id).toBe('3');
		});

		it('空配列を処理できる', () => {
			const result = sortTasks([], 'priority');

			expect(result).toEqual([]);
		});

		it('元の配列を変更しない', () => {
			const tasks = [
				createTask('1', 'Task 1', { priority: 'low' }),
				createTask('2', 'Task 2', { priority: 'high' }),
			];
			const originalFirst = tasks[0];

			sortTasks(tasks, 'priority');

			expect(tasks[0]).toBe(originalFirst);
		});
	});

	describe('due mode', () => {
		it('日付昇順でソートする（期限が近い順）', () => {
			const tasks = [
				createTask('1', 'Task 1', { due: '2025-03-15' }),
				createTask('2', 'Task 2', { due: '2025-01-10' }),
				createTask('3', 'Task 3', { due: '2025-02-20' }),
			];

			const result = sortTasks(tasks, 'due');

			expect(result[0].metadata.due).toBe('2025-01-10');
			expect(result[1].metadata.due).toBe('2025-02-20');
			expect(result[2].metadata.due).toBe('2025-03-15');
		});

		it('期限未設定のタスクは最後に配置する', () => {
			const tasks = [
				createTask('1', 'Task 1'),
				createTask('2', 'Task 2', { due: '2025-01-10' }),
				createTask('3', 'Task 3'),
			];

			const result = sortTasks(tasks, 'due');

			expect(result[0].metadata.due).toBe('2025-01-10');
			expect(result[1].metadata.due).toBeUndefined();
			expect(result[2].metadata.due).toBeUndefined();
		});

		it('同一期限のタスクは相対順序を維持する', () => {
			const tasks = [
				createTask('1', 'First', { due: '2025-01-10' }),
				createTask('2', 'Second', { due: '2025-01-10' }),
				createTask('3', 'Third', { due: '2025-01-10' }),
			];

			const result = sortTasks(tasks, 'due');

			expect(result[0].id).toBe('1');
			expect(result[1].id).toBe('2');
			expect(result[2].id).toBe('3');
		});

		it('空配列を処理できる', () => {
			const result = sortTasks([], 'due');

			expect(result).toEqual([]);
		});

		it('元の配列を変更しない', () => {
			const tasks = [
				createTask('1', 'Task 1', { due: '2025-03-15' }),
				createTask('2', 'Task 2', { due: '2025-01-10' }),
			];
			const originalFirst = tasks[0];

			sortTasks(tasks, 'due');

			expect(tasks[0]).toBe(originalFirst);
		});

		it('期限未設定のタスクのみでも処理できる', () => {
			const tasks = [createTask('1', 'Task 1'), createTask('2', 'Task 2')];

			const result = sortTasks(tasks, 'due');

			expect(result[0].id).toBe('1');
			expect(result[1].id).toBe('2');
		});
	});
});
