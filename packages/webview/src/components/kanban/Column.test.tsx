import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTask, createMockTasks } from '../../test/factories';
import { Column } from './Column';

// Mock DnD kit
vi.mock('@dnd-kit/core', () => ({
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
}));

describe('Column', () => {
	const defaultProps = {
		status: 'todo',
		tasks: [],
		isDone: false,
		onTaskClick: vi.fn(),
		onAddTask: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Column Header', () => {
		it('should render column with status header', () => {
			render(<Column {...defaultProps} />);

			// CSS applies uppercase, but DOM text is lowercase
			expect(screen.getByText('todo')).toBeInTheDocument();
		});

		it('should display task count in badge', () => {
			const tasks = createMockTasks(3);
			render(<Column {...defaultProps} tasks={tasks} />);

			expect(screen.getByText('3')).toBeInTheDocument();
		});

		it('should show 0 count when no tasks', () => {
			render(<Column {...defaultProps} tasks={[]} />);

			expect(screen.getByText('0')).toBeInTheDocument();
		});

		it('should apply done styling when isDone is true', () => {
			render(<Column {...defaultProps} status="done" isDone={true} />);

			// CSS applies uppercase, but DOM text is lowercase
			const header = screen.getByText('done');
			expect(header).toHaveClass('text-green-600');
		});

		it('should not apply done styling when isDone is false', () => {
			render(<Column {...defaultProps} status="todo" isDone={false} />);

			// CSS applies uppercase, but DOM text is lowercase
			const header = screen.getByText('todo');
			expect(header).not.toHaveClass('text-green-600');
		});
	});

	describe('Task List', () => {
		it('should render tasks in the column', () => {
			const tasks = [
				createMockTask({ id: '1', title: 'Task 1' }),
				createMockTask({ id: '2', title: 'Task 2' }),
			];
			render(<Column {...defaultProps} tasks={tasks} />);

			expect(screen.getByText('Task 1')).toBeInTheDocument();
			expect(screen.getByText('Task 2')).toBeInTheDocument();
		});

		it('should show "No tasks" message when column is empty', () => {
			render(<Column {...defaultProps} tasks={[]} />);

			expect(screen.getByText('No tasks')).toBeInTheDocument();
		});
	});

	describe('Task Interaction', () => {
		it('should call onTaskClick when a task is clicked', async () => {
			const user = userEvent.setup();
			const onTaskClick = vi.fn();
			const task = createMockTask({ id: 'task-1', title: 'Test Task' });
			render(<Column {...defaultProps} tasks={[task]} onTaskClick={onTaskClick} />);

			await user.click(screen.getByText('Test Task'));

			expect(onTaskClick).toHaveBeenCalledWith(task);
		});
	});

	describe('Add Task Button', () => {
		it('should render Add task button', () => {
			render(<Column {...defaultProps} />);

			expect(screen.getByText('Add task')).toBeInTheDocument();
		});

		it('should call onAddTask when Add task button is clicked', async () => {
			const user = userEvent.setup();
			const onAddTask = vi.fn();
			render(<Column {...defaultProps} onAddTask={onAddTask} />);

			await user.click(screen.getByText('Add task'));

			expect(onAddTask).toHaveBeenCalledWith('todo');
		});

		it('should pass correct status to onAddTask', async () => {
			const user = userEvent.setup();
			const onAddTask = vi.fn();
			render(<Column {...defaultProps} status="in-progress" onAddTask={onAddTask} />);

			await user.click(screen.getByText('Add task'));

			expect(onAddTask).toHaveBeenCalledWith('in-progress');
		});
	});
});
