import type { DragEndEvent } from '@dnd-kit/core';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConfig, createMockTask } from '../../test/factories';
import { getMockVsCodeApi, simulateExtensionMessage } from '../../test/mocks/vscodeApi';

// Store onDragEnd callback for testing
let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null;

// Mock DnD kit
vi.mock('@dnd-kit/core', () => ({
	DndContext: ({
		children,
		onDragEnd,
	}: {
		children: React.ReactNode;
		onDragEnd?: (event: DragEndEvent) => void;
	}) => {
		// Capture the onDragEnd callback for testing
		capturedOnDragEnd = onDragEnd ?? null;
		return <>{children}</>;
	},
	DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useDroppable: () => ({
		isOver: false,
		setNodeRef: vi.fn(),
	}),
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		isDragging: false,
	}),
	useSensors: () => [],
	useSensor: () => ({}),
	PointerSensor: class {},
}));

// Reset module cache before each test
beforeEach(async () => {
	vi.resetModules();
	capturedOnDragEnd = null;
});

describe('KanbanBoard', () => {
	describe('Loading State', () => {
		it('should display loading spinner initially', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
		});

		it('should hide loading spinner after tasks are loaded', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
			});

			await waitFor(() => {
				expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
			});
		});
	});

	describe('Error Handling', () => {
		it('should display error message when error occurs', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'ERROR',
					payload: { message: 'Failed to load tasks', code: 'TaskParseError' },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
				expect(screen.getByText('Retry')).toBeInTheDocument();
			});
		});

		it('should retry loading tasks when Retry button is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'ERROR',
					payload: { message: 'Failed to load tasks' },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Retry')).toBeInTheDocument();
			});

			// Clear previous calls
			getMockVsCodeApi().postMessage.mockClear();

			await user.click(screen.getByText('Retry'));

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({ type: 'GET_TASKS' });
		});
	});

	describe('Task Display', () => {
		it('should display tasks in correct columns', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: {
						tasks: [
							createMockTask({ id: '1', title: 'Todo Task', status: 'todo' }),
							createMockTask({ id: '2', title: 'In Progress Task', status: 'in-progress' }),
							createMockTask({ id: '3', title: 'Done Task', status: 'done' }),
						],
					},
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Todo Task')).toBeInTheDocument();
				expect(screen.getByText('In Progress Task')).toBeInTheDocument();
				expect(screen.getByText('Done Task')).toBeInTheDocument();
			});

			// Verify columns are rendered
			expect(screen.getByText('todo')).toBeInTheDocument();
			expect(screen.getByText('in-progress')).toBeInTheDocument();
			expect(screen.getByText('done')).toBeInTheDocument();
		});

		it('should show empty state when no tasks', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
			});

			await waitFor(() => {
				// Each column should show "No tasks"
				const noTasksElements = screen.getAllByText('No tasks');
				expect(noTasksElements.length).toBe(3);
			});
		});
	});

	describe('Initial Data Fetch', () => {
		it('should request config and tasks on mount', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			const mockApi = getMockVsCodeApi();
			expect(mockApi.postMessage).toHaveBeenCalledWith({ type: 'GET_CONFIG' });
			expect(mockApi.postMessage).toHaveBeenCalledWith({ type: 'GET_TASKS' });
		});
	});

	describe('Task Modal', () => {
		it('should open new task modal when Add task is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
			});

			await waitFor(() => {
				expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
			});

			// Find and click the first "Add task" button
			const addButtons = screen.getAllByText('Add task');
			await user.click(addButtons[0]);

			expect(screen.getByText('New Task')).toBeInTheDocument();
		});

		it('should open edit modal when task is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: {
						tasks: [createMockTask({ id: '1', title: 'Test Task', status: 'todo' })],
					},
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Test Task')).toBeInTheDocument();
			});

			await user.click(screen.getByText('Test Task'));

			expect(screen.getByText('Edit Task')).toBeInTheDocument();
		});

		it('should create task when modal form is submitted', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
			});

			await waitFor(() => {
				expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
			});

			// Open modal
			const addButtons = screen.getAllByText('Add task');
			await user.click(addButtons[0]);

			// Fill form
			await user.type(screen.getByLabelText('Title'), 'New Task Title');
			await user.click(screen.getByText('Create'));

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'CREATE_TASK',
				payload: expect.objectContaining({
					title: 'New Task Title',
				}),
			});
		});

		it('should delete task when delete button is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: {
						tasks: [createMockTask({ id: 'task-to-delete', title: 'Delete Me', status: 'todo' })],
					},
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Delete Me')).toBeInTheDocument();
			});

			// Open edit modal
			await user.click(screen.getByText('Delete Me'));

			// Click delete
			await user.click(screen.getByText('Delete'));

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'DELETE_TASK',
				payload: { id: 'task-to-delete' },
			});
		});
	});

	describe('Floating Actions', () => {
		it('should show save/discard buttons when document is dirty', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
				simulateExtensionMessage({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: true },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Save')).toBeInTheDocument();
				expect(screen.getByText('Discard')).toBeInTheDocument();
			});
		});

		it('should call saveDocument when Save is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
				simulateExtensionMessage({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: true },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Save')).toBeInTheDocument();
			});

			await user.click(screen.getByText('Save'));

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'SAVE_DOCUMENT',
			});
		});

		it('should call revertDocument when Discard is clicked', async () => {
			const user = userEvent.setup();
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			act(() => {
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [] },
				});
				simulateExtensionMessage({
					type: 'DOCUMENT_STATE_CHANGED',
					payload: { isDirty: true },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Discard')).toBeInTheDocument();
			});

			await user.click(screen.getByText('Discard'));

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'REVERT_DOCUMENT',
			});
		});
	});

	describe('Drag and Drop', () => {
		it('should change task status when dropped on different column', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			const task = createMockTask({ id: 'task-1', title: 'Draggable Task', status: 'todo' });

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [task] },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Draggable Task')).toBeInTheDocument();
			});

			// Clear previous calls
			getMockVsCodeApi().postMessage.mockClear();

			// Simulate drag end event: drag task-1 from 'todo' to 'done'
			expect(capturedOnDragEnd).not.toBeNull();
			act(() => {
				capturedOnDragEnd?.({
					active: {
						id: 'task-1',
						data: { current: { task } },
					},
					over: {
						id: 'done',
					},
				} as unknown as DragEndEvent);
			});

			expect(getMockVsCodeApi().postMessage).toHaveBeenCalledWith({
				type: 'CHANGE_TASK_STATUS',
				payload: { id: 'task-1', status: 'done' },
			});
		});

		it('should not change status when dropped on same column', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			const task = createMockTask({ id: 'task-1', title: 'Draggable Task', status: 'todo' });

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [task] },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Draggable Task')).toBeInTheDocument();
			});

			// Clear previous calls
			getMockVsCodeApi().postMessage.mockClear();

			// Simulate drag end event: drag task-1 within 'todo' column (no change)
			expect(capturedOnDragEnd).not.toBeNull();
			act(() => {
				capturedOnDragEnd?.({
					active: {
						id: 'task-1',
						data: { current: { task } },
					},
					over: {
						id: 'todo', // Same as current status
					},
				} as unknown as DragEndEvent);
			});

			// Should NOT call CHANGE_TASK_STATUS
			expect(getMockVsCodeApi().postMessage).not.toHaveBeenCalledWith({
				type: 'CHANGE_TASK_STATUS',
				payload: expect.anything(),
			});
		});

		it('should not change status when dropped outside any column', async () => {
			const { KanbanBoard } = await import('./KanbanBoard');
			render(<KanbanBoard />);

			const task = createMockTask({ id: 'task-1', title: 'Draggable Task', status: 'todo' });

			act(() => {
				simulateExtensionMessage({
					type: 'CONFIG_UPDATED',
					payload: { config: createMockConfig() },
				});
				simulateExtensionMessage({
					type: 'TASKS_UPDATED',
					payload: { tasks: [task] },
				});
			});

			await waitFor(() => {
				expect(screen.getByText('Draggable Task')).toBeInTheDocument();
			});

			// Clear previous calls
			getMockVsCodeApi().postMessage.mockClear();

			// Simulate drag end event: dropped outside (over is null)
			expect(capturedOnDragEnd).not.toBeNull();
			act(() => {
				capturedOnDragEnd?.({
					active: {
						id: 'task-1',
						data: { current: { task } },
					},
					over: null,
				} as unknown as DragEndEvent);
			});

			// Should NOT call CHANGE_TASK_STATUS
			expect(getMockVsCodeApi().postMessage).not.toHaveBeenCalledWith({
				type: 'CHANGE_TASK_STATUS',
				payload: expect.anything(),
			});
		});
	});
});
