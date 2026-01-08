import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTask } from '../../test/factories';
import { TaskModal } from './TaskModal';

describe('TaskModal', () => {
	const defaultProps = {
		isOpen: true,
		task: null,
		defaultStatus: 'todo',
		statuses: ['todo', 'in-progress', 'done'],
		paths: [
			['Project', 'Feature A'],
			['Project', 'Feature B'],
		],
		onClose: vi.fn(),
		onSave: vi.fn(),
		onDelete: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Task Creation', () => {
		it('should render create modal with empty form', () => {
			render(<TaskModal {...defaultProps} />);

			expect(screen.getByText('New Task')).toBeInTheDocument();
			expect(screen.getByLabelText('Title')).toHaveValue('');
			expect(screen.getByText('Create')).toBeInTheDocument();
		});

		it('should call onSave with new task data when form is submitted', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), 'New Task Title');
			await user.selectOptions(screen.getByLabelText('Status'), 'in-progress');
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'New Task Title',
				status: 'in-progress',
				path: [],
				metadata: {},
			});
			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should not submit when title is empty', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).not.toHaveBeenCalled();
		});

		it('should allow selecting a path', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), 'Task with Path');
			await user.selectOptions(screen.getByLabelText('Path'), 'Project / Feature A');
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Task with Path',
				status: 'todo',
				path: ['Project', 'Feature A'],
				metadata: {},
			});
		});

		it('should allow selecting a priority', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), 'High Priority Task');
			await user.selectOptions(screen.getByLabelText('Priority'), 'high');
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'High Priority Task',
				status: 'todo',
				path: [],
				metadata: { priority: 'high' },
			});
		});

		it('should not include priority in metadata when None is selected', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), 'No Priority Task');
			// Priority defaults to None (empty string)
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'No Priority Task',
				status: 'todo',
				path: [],
				metadata: {},
			});
		});
	});

	describe('Task Editing', () => {
		const existingTask = createMockTask({
			id: 'task-1',
			title: 'Existing Task',
			status: 'todo',
			path: ['Project', 'Feature A'],
		});

		it('should render edit modal with pre-filled form', () => {
			render(<TaskModal {...defaultProps} task={existingTask} />);

			expect(screen.getByText('Edit Task')).toBeInTheDocument();
			expect(screen.getByLabelText('Title')).toHaveValue('Existing Task');
			expect(screen.getByText('Update')).toBeInTheDocument();
		});

		it('should call onSave with updated task data', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} task={existingTask} />);

			await user.clear(screen.getByLabelText('Title'));
			await user.type(screen.getByLabelText('Title'), 'Updated Title');
			await user.click(screen.getByText('Update'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Updated Title',
				status: 'todo',
				path: ['Project', 'Feature A'],
				metadata: {},
			});
		});

		it('should allow changing status in edit mode', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} task={existingTask} />);

			await user.selectOptions(screen.getByLabelText('Status'), 'done');
			await user.click(screen.getByText('Update'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Existing Task',
				status: 'done',
				path: ['Project', 'Feature A'],
				metadata: {},
			});
		});

		it('should pre-fill priority from existing task', async () => {
			const user = userEvent.setup();
			const taskWithPriority = createMockTask({
				id: 'task-1',
				title: 'Priority Task',
				status: 'todo',
				path: [],
				metadata: { priority: 'medium' },
			});
			render(<TaskModal {...defaultProps} task={taskWithPriority} />);

			expect(screen.getByLabelText('Priority')).toHaveValue('medium');

			await user.click(screen.getByText('Update'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Priority Task',
				status: 'todo',
				path: [],
				metadata: { priority: 'medium' },
			});
		});

		it('should allow changing priority in edit mode', async () => {
			const user = userEvent.setup();
			const taskWithPriority = createMockTask({
				id: 'task-1',
				title: 'Priority Task',
				status: 'todo',
				path: [],
				metadata: { priority: 'low' },
			});
			render(<TaskModal {...defaultProps} task={taskWithPriority} />);

			await user.selectOptions(screen.getByLabelText('Priority'), 'high');
			await user.click(screen.getByText('Update'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Priority Task',
				status: 'todo',
				path: [],
				metadata: { priority: 'high' },
			});
		});
	});

	describe('Task Deletion', () => {
		it('should show delete button only in edit mode', () => {
			const { rerender } = render(<TaskModal {...defaultProps} />);
			expect(screen.queryByText('Delete')).not.toBeInTheDocument();

			rerender(<TaskModal {...defaultProps} task={createMockTask()} />);
			expect(screen.getByText('Delete')).toBeInTheDocument();
		});

		it('should call onDelete when delete button is clicked', async () => {
			const user = userEvent.setup();
			const task = createMockTask({ id: 'task-to-delete' });
			render(<TaskModal {...defaultProps} task={task} />);

			await user.click(screen.getByText('Delete'));

			expect(defaultProps.onDelete).toHaveBeenCalledWith('task-to-delete');
			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should not show delete button when onDelete is not provided', () => {
			const task = createMockTask({ id: 'task-1' });
			render(<TaskModal {...defaultProps} task={task} onDelete={undefined} />);

			expect(screen.queryByText('Delete')).not.toBeInTheDocument();
		});
	});

	describe('Modal Behavior', () => {
		it('should not render when isOpen is false', () => {
			render(<TaskModal {...defaultProps} isOpen={false} />);

			expect(screen.queryByText('New Task')).not.toBeInTheDocument();
		});

		it('should close modal when Cancel is clicked', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.click(screen.getByText('Cancel'));

			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should close modal when Escape is pressed', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			// Focus the modal first (the input gets auto-focused), then press Escape
			const titleInput = screen.getByLabelText('Title');
			titleInput.focus();
			await user.keyboard('{Escape}');

			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should close modal when overlay is clicked', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.click(screen.getByLabelText('Close modal'));

			expect(defaultProps.onClose).toHaveBeenCalled();
		});

		it('should close modal when X button is clicked', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			// X button is the button containing the X icon in the header
			const closeButtons = screen.getAllByRole('button');
			// Find the X button (it's in the header, before Cancel)
			const xButton = closeButtons.find((btn) => btn.querySelector('svg.lucide-x') !== null);
			expect(xButton).toBeDefined();
			if (xButton) {
				await user.click(xButton);
			}

			expect(defaultProps.onClose).toHaveBeenCalled();
		});
	});

	describe('Form Validation', () => {
		it('should trim whitespace from title', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), '  Trimmed Title  ');
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).toHaveBeenCalledWith({
				title: 'Trimmed Title',
				status: 'todo',
				path: [],
				metadata: {},
			});
		});

		it('should not submit when title is only whitespace', async () => {
			const user = userEvent.setup();
			render(<TaskModal {...defaultProps} />);

			await user.type(screen.getByLabelText('Title'), '   ');
			await user.click(screen.getByText('Create'));

			expect(defaultProps.onSave).not.toHaveBeenCalled();
		});
	});
});
