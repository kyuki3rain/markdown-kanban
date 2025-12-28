import { err, ok } from 'neverthrow';
import { describe, expect, it, vi } from 'vitest';
import { Task } from '../../domain/entities/task';
import { TaskParseError } from '../../domain/errors/taskParseError';
import {
	type ConfigProvider,
	DEFAULT_CONFIG,
	type KanbanConfig,
} from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { GetTasksUseCase } from './getTasksUseCase';

describe('GetTasksUseCase', () => {
	const createMockTaskRepository = (overrides: Partial<TaskRepository> = {}): TaskRepository => ({
		findAll: vi.fn(),
		findById: vi.fn(),
		findByPath: vi.fn(),
		save: vi.fn(),
		delete: vi.fn(),
		getAvailablePaths: vi.fn(),
		...overrides,
	});

	const createMockConfigProvider = (overrides: Partial<KanbanConfig> = {}): ConfigProvider => ({
		getConfig: vi.fn().mockResolvedValue({ ...DEFAULT_CONFIG, ...overrides }),
		get: vi.fn().mockImplementation((key: keyof KanbanConfig) => {
			const config = { ...DEFAULT_CONFIG, ...overrides };
			return Promise.resolve(config[key]);
		}),
	});

	const createTask = (
		id: string,
		title: string,
		statusValue: string,
		metadata: Record<string, string> = {},
	): Task => {
		const status = Status.create(statusValue)._unsafeUnwrap();
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

	describe('execute', () => {
		it('全タスクを取得できる', async () => {
			const tasks = [
				createTask('1', 'Task 1', 'todo'),
				createTask('2', 'Task 2', 'in-progress'),
				createTask('3', 'Task 3', 'done'),
			];

			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(ok(tasks)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new GetTasksUseCase(repository, configProvider);
			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(3);
		});

		it('タスクが存在しない場合は空配列を返す', async () => {
			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(ok([])),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new GetTasksUseCase(repository, configProvider);
			const result = await useCase.execute();

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(0);
		});

		it('パースエラーが発生した場合はエラーを返す', async () => {
			const parseError = new TaskParseError(10, 'Parse failed');
			const repository = createMockTaskRepository({
				findAll: vi.fn().mockResolvedValue(err(parseError)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new GetTasksUseCase(repository, configProvider);
			const result = await useCase.execute();

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe(parseError);
		});
	});

	describe('executeByPath', () => {
		it('指定したパス配下のタスクを取得できる', async () => {
			const path = Path.create(['Project', 'Feature A']);
			const tasks = [createTask('1', 'Task 1', 'todo'), createTask('2', 'Task 2', 'in-progress')];

			const repository = createMockTaskRepository({
				findByPath: vi.fn().mockResolvedValue(ok(tasks)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new GetTasksUseCase(repository, configProvider);
			const result = await useCase.executeByPath(path);

			expect(result.isOk()).toBe(true);
			expect(result._unsafeUnwrap()).toHaveLength(2);
			expect(repository.findByPath).toHaveBeenCalledWith(path);
		});

		it('パースエラーが発生した場合はエラーを返す', async () => {
			const path = Path.create(['Project']);
			const parseError = new TaskParseError(10, 'Parse failed');
			const repository = createMockTaskRepository({
				findByPath: vi.fn().mockResolvedValue(err(parseError)),
			});
			const configProvider = createMockConfigProvider();

			const useCase = new GetTasksUseCase(repository, configProvider);
			const result = await useCase.executeByPath(path);

			expect(result.isErr()).toBe(true);
			expect(result._unsafeUnwrapErr()).toBe(parseError);
		});
	});

	describe('ソート機能', () => {
		describe('sortBy: markdown', () => {
			it('元の順序を維持する', async () => {
				const tasks = [
					createTask('1', 'C Task', 'todo'),
					createTask('2', 'A Task', 'todo'),
					createTask('3', 'B Task', 'todo'),
				];

				const repository = createMockTaskRepository({
					findAll: vi.fn().mockResolvedValue(ok(tasks)),
				});
				const configProvider = createMockConfigProvider({ sortBy: 'markdown' });

				const useCase = new GetTasksUseCase(repository, configProvider);
				const result = await useCase.execute();

				expect(result.isOk()).toBe(true);
				const sortedTasks = result._unsafeUnwrap();
				expect(sortedTasks[0].id).toBe('1');
				expect(sortedTasks[1].id).toBe('2');
				expect(sortedTasks[2].id).toBe('3');
			});
		});

		describe('sortBy: alphabetical', () => {
			it('タイトルでアルファベット順にソートする', async () => {
				const tasks = [
					createTask('1', 'Charlie', 'todo'),
					createTask('2', 'Alpha', 'todo'),
					createTask('3', 'Bravo', 'todo'),
				];

				const repository = createMockTaskRepository({
					findAll: vi.fn().mockResolvedValue(ok(tasks)),
				});
				const configProvider = createMockConfigProvider({ sortBy: 'alphabetical' });

				const useCase = new GetTasksUseCase(repository, configProvider);
				const result = await useCase.execute();

				expect(result.isOk()).toBe(true);
				const sortedTasks = result._unsafeUnwrap();
				expect(sortedTasks[0].title).toBe('Alpha');
				expect(sortedTasks[1].title).toBe('Bravo');
				expect(sortedTasks[2].title).toBe('Charlie');
			});
		});

		describe('sortBy: priority', () => {
			it('優先度順にソートする（high > medium > low > 未設定）', async () => {
				const tasks = [
					createTask('1', 'Task 1', 'todo', { priority: 'low' }),
					createTask('2', 'Task 2', 'todo'),
					createTask('3', 'Task 3', 'todo', { priority: 'high' }),
					createTask('4', 'Task 4', 'todo', { priority: 'medium' }),
				];

				const repository = createMockTaskRepository({
					findAll: vi.fn().mockResolvedValue(ok(tasks)),
				});
				const configProvider = createMockConfigProvider({ sortBy: 'priority' });

				const useCase = new GetTasksUseCase(repository, configProvider);
				const result = await useCase.execute();

				expect(result.isOk()).toBe(true);
				const sortedTasks = result._unsafeUnwrap();
				expect(sortedTasks[0].metadata.priority).toBe('high');
				expect(sortedTasks[1].metadata.priority).toBe('medium');
				expect(sortedTasks[2].metadata.priority).toBe('low');
				expect(sortedTasks[3].metadata.priority).toBeUndefined();
			});
		});

		describe('sortBy: due', () => {
			it('期限順にソートする（未設定は最後）', async () => {
				const tasks = [
					createTask('1', 'Task 1', 'todo', { due: '2025-03-15' }),
					createTask('2', 'Task 2', 'todo'),
					createTask('3', 'Task 3', 'todo', { due: '2025-01-10' }),
					createTask('4', 'Task 4', 'todo', { due: '2025-02-20' }),
				];

				const repository = createMockTaskRepository({
					findAll: vi.fn().mockResolvedValue(ok(tasks)),
				});
				const configProvider = createMockConfigProvider({ sortBy: 'due' });

				const useCase = new GetTasksUseCase(repository, configProvider);
				const result = await useCase.execute();

				expect(result.isOk()).toBe(true);
				const sortedTasks = result._unsafeUnwrap();
				expect(sortedTasks[0].metadata.due).toBe('2025-01-10');
				expect(sortedTasks[1].metadata.due).toBe('2025-02-20');
				expect(sortedTasks[2].metadata.due).toBe('2025-03-15');
				expect(sortedTasks[3].metadata.due).toBeUndefined();
			});
		});

		describe('executeByPathでもソートが適用される', () => {
			it('パス指定でもアルファベット順にソートする', async () => {
				const path = Path.create(['Project']);
				const tasks = [createTask('1', 'Zulu', 'todo'), createTask('2', 'Alpha', 'todo')];

				const repository = createMockTaskRepository({
					findByPath: vi.fn().mockResolvedValue(ok(tasks)),
				});
				const configProvider = createMockConfigProvider({ sortBy: 'alphabetical' });

				const useCase = new GetTasksUseCase(repository, configProvider);
				const result = await useCase.executeByPath(path);

				expect(result.isOk()).toBe(true);
				const sortedTasks = result._unsafeUnwrap();
				expect(sortedTasks[0].title).toBe('Alpha');
				expect(sortedTasks[1].title).toBe('Zulu');
			});
		});
	});
});
