import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConfig, createMockTask } from '../test/factories';
import { getMockVsCodeApi, simulateExtensionMessage } from '../test/mocks/vscodeApi';

// Reset module cache before each test to clear the cached vscodeApi instance
beforeEach(async () => {
	vi.resetModules();
});

describe('useVscodeApi', () => {
	describe('postMessage', () => {
		it('should call postMessage on the VS Code API', async () => {
			const { useVscodeApi } = await import('./useVscodeApi');
			const { result } = renderHook(() => useVscodeApi());

			act(() => {
				result.current.postMessage({ type: 'GET_TASKS' });
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({ type: 'GET_TASKS' });
		});
	});

	describe('getState and setState', () => {
		it('should get state from VS Code API', async () => {
			getMockVsCodeApi().getState.mockReturnValue({ test: 'state' });
			const { useVscodeApi } = await import('./useVscodeApi');
			const { result } = renderHook(() => useVscodeApi());

			expect(result.current.getState()).toEqual({ test: 'state' });
		});

		it('should set state on VS Code API', async () => {
			const { useVscodeApi } = await import('./useVscodeApi');
			const { result } = renderHook(() => useVscodeApi());

			act(() => {
				result.current.setState({ new: 'state' });
			});

			expect(getMockVsCodeApi().setState).toHaveBeenCalledWith({ new: 'state' });
		});
	});
});

describe('useKanban', () => {
	describe('Initial State', () => {
		it('should start with loading state', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			expect(result.current.isLoading).toBe(true);
			expect(result.current.tasks).toEqual([]);
			expect(result.current.error).toBeNull();
		});

		it('should request config and tasks on mount', async () => {
			const { useKanban } = await import('./useVscodeApi');
			renderHook(() => useKanban());

			const mockApi = getMockVsCodeApi();
			expect(mockApi.postMessage).toHaveBeenCalledWith({ type: 'GET_CONFIG' });
			expect(mockApi.postMessage).toHaveBeenCalledWith({ type: 'GET_TASKS' });
		});
	});

	describe('Task Updates', () => {
		it('should update tasks when TASKS_UPDATED message is received', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const tasks = [
				createMockTask({ id: '1', title: 'Task 1', status: 'todo' }),
				createMockTask({ id: '2', title: 'Task 2', status: 'done' }),
			];

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			await waitFor(() => {
				expect(result.current.tasks).toEqual(tasks);
				expect(result.current.isLoading).toBe(false);
			});
		});

		it('should group tasks by status', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
			});

			const tasks = [
				createMockTask({ id: '1', title: 'Task 1', status: 'todo' }),
				createMockTask({ id: '2', title: 'Task 2', status: 'todo' }),
				createMockTask({ id: '3', title: 'Task 3', status: 'done' }),
			];

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			await waitFor(() => {
				expect(result.current.tasksByStatus.todo).toHaveLength(2);
				expect(result.current.tasksByStatus.done).toHaveLength(1);
				expect(result.current.tasksByStatus['in-progress']).toHaveLength(0);
			});
		});
	});

	describe('Configuration Updates', () => {
		it('should update config when CONFIG_UPDATED message is received', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const customConfig = createMockConfig({
				statuses: ['backlog', 'todo', 'done'],
				defaultStatus: 'backlog',
			});

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: customConfig },
				});
			});

			await waitFor(() => {
				expect(result.current.config.statuses).toEqual(['backlog', 'todo', 'done']);
				expect(result.current.config.defaultStatus).toBe('backlog');
			});
		});

		it('should use default config if none is received', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			expect(result.current.config.statuses).toEqual(['todo', 'in-progress', 'done']);
		});
	});

	describe('Error Handling', () => {
		it('should set error when ERROR message is received', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				simulateExtensionMessage({
					type: 'ERROR',
					payload: { message: 'Failed to load tasks', code: 'TaskParseError' },
				});
			});

			await waitFor(() => {
				expect(result.current.error).toBe('Failed to load tasks');
				expect(result.current.isLoading).toBe(false);
			});
		});

		it('should show special message for NoActiveEditorError', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				simulateExtensionMessage({
					type: 'ERROR',
					payload: { message: 'No active editor', code: 'NoActiveEditorError' },
				});
			});

			await waitFor(() => {
				expect(result.current.error).toBe('Markdownファイルを開いてください');
			});
		});

		it('should clear error when clearError is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				simulateExtensionMessage({
					type: 'ERROR',
					payload: { message: 'Error' },
				});
			});

			await waitFor(() => {
				expect(result.current.error).toBe('Error');
			});

			act(() => {
				result.current.actions.clearError();
			});

			expect(result.current.error).toBeNull();
		});
	});

	describe('Document State', () => {
		it('should update isDirty when DOCUMENT_STATE_CHANGED message is received', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			expect(result.current.isDirty).toBe(false);

			act(() => {
				simulateExtensionMessage({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: true },
				});
			});

			await waitFor(() => {
				expect(result.current.isDirty).toBe(true);
			});
		});
	});

	describe('Task Actions', () => {
		it('should post CREATE_TASK message when createTask is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.createTask({
					title: 'New Task',
					path: ['Project'],
					status: 'todo',
				});
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'CREATE_TASK',
				payload: {
					title: 'New Task',
					path: ['Project'],
					status: 'todo',
				},
			});
		});

		it('should post UPDATE_TASK message when updateTask is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.updateTask({
					id: 'task-1',
					title: 'Updated Title',
				});
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'UPDATE_TASK',
				payload: {
					id: 'task-1',
					title: 'Updated Title',
				},
			});
		});

		it('should post DELETE_TASK message when deleteTask is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.deleteTask('task-1');
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'DELETE_TASK',
				payload: { id: 'task-1' },
			});
		});

		it('should post CHANGE_TASK_STATUS message when changeTaskStatus is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.changeTaskStatus('task-1', 'done');
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'CHANGE_TASK_STATUS',
				payload: { id: 'task-1', status: 'done' },
			});
		});

		it('should post GET_TASKS message when refreshTasks is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			// Clear initial GET_TASKS call
			getMockVsCodeApi().postMessage.mockClear();

			act(() => {
				result.current.actions.refreshTasks();
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'GET_TASKS',
			});
			expect(result.current.isLoading).toBe(true);
		});

		it('should post SAVE_DOCUMENT message when saveDocument is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.saveDocument();
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'SAVE_DOCUMENT',
			});
		});

		it('should post REVERT_DOCUMENT message when revertDocument is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.revertDocument();
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'REVERT_DOCUMENT',
			});
		});
	});

	describe('Paths Extraction', () => {
		it('should extract unique paths from tasks', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const tasks = [
				createMockTask({ id: '1', path: ['Project', 'Feature A'] }),
				createMockTask({ id: '2', path: ['Project', 'Feature A'] }),
				createMockTask({ id: '3', path: ['Project', 'Feature B'] }),
				createMockTask({ id: '4', path: [] }),
			];

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			await waitFor(() => {
				expect(result.current.paths).toContainEqual(['Project', 'Feature A']);
				expect(result.current.paths).toContainEqual(['Project', 'Feature B']);
				expect(result.current.paths).toContainEqual([]);
				// Should have 3 unique paths (including empty)
				expect(result.current.paths).toHaveLength(3);
			});
		});
	});

	describe('Filter Paths', () => {
		it('should filter tasks when filterPaths is set in config', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const tasks = [
				createMockTask({ id: '1', path: ['Project', 'Feature A'], status: 'todo' }),
				createMockTask({ id: '2', path: ['Project', 'Feature B'], status: 'todo' }),
				createMockTask({ id: '3', path: ['Project', 'Feature A'], status: 'done' }),
			];

			// First set tasks
			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			// Then set config with filterPaths
			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: {
						config: createMockConfig({
							filterPaths: ['Project / Feature A'],
						}),
					},
				});
			});

			await waitFor(() => {
				// tasksByStatus should only contain tasks matching filterPaths
				const allFilteredTasks = [
					...result.current.tasksByStatus.todo,
					...result.current.tasksByStatus['in-progress'],
					...result.current.tasksByStatus.done,
				];
				expect(allFilteredTasks).toHaveLength(2);
				expect(allFilteredTasks.every((t) => t.path.join(' / ') === 'Project / Feature A')).toBe(
					true,
				);
			});
		});

		it('should show all tasks when filterPaths is empty', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const tasks = [
				createMockTask({ id: '1', path: ['Project', 'Feature A'], status: 'todo' }),
				createMockTask({ id: '2', path: ['Project', 'Feature B'], status: 'todo' }),
			];

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: {
						config: createMockConfig({
							filterPaths: [],
						}),
					},
				});
			});

			await waitFor(() => {
				expect(result.current.tasksByStatus.todo).toHaveLength(2);
			});
		});

		it('should update filtered tasks when filterPaths changes', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			const tasks = [
				createMockTask({ id: '1', path: ['Project', 'Feature A'], status: 'todo' }),
				createMockTask({ id: '2', path: ['Project', 'Feature B'], status: 'todo' }),
			];

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks },
				});
			});

			// Initially show all
			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig({ filterPaths: [] }) },
				});
			});

			await waitFor(() => {
				expect(result.current.tasksByStatus.todo).toHaveLength(2);
			});

			// Now filter to Feature A only
			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig({ filterPaths: ['Project / Feature A'] }) },
				});
			});

			await waitFor(() => {
				expect(result.current.tasksByStatus.todo).toHaveLength(1);
				expect(result.current.tasksByStatus.todo[0].path).toEqual(['Project', 'Feature A']);
			});
		});

		it('should post UPDATE_CONFIG message when updateConfig is called', async () => {
			const { useKanban } = await import('./useVscodeApi');
			const { result } = renderHook(() => useKanban());

			act(() => {
				result.current.actions.updateConfig({ filterPaths: ['Project / Feature'] });
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'UPDATE_CONFIG',
				payload: { filterPaths: ['Project / Feature'] },
			});
		});
	});
});
