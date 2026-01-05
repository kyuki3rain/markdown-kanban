import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTask } from '../../test/factories';
import { TaskCard } from './TaskCard';

// Mock DnD kit
vi.mock('@dnd-kit/core', () => ({
	useDraggable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		isDragging: false,
	}),
}));

describe('TaskCard', () => {
	const defaultProps = {
		task: createMockTask(),
		onClick: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Task Display', () => {
		it('should render task title', () => {
			render(<TaskCard {...defaultProps} />);

			expect(screen.getByText('Test Task')).toBeInTheDocument();
		});

		it('should render path badge when task has path', () => {
			const task = createMockTask({ path: ['Project', 'Feature'] });
			render(<TaskCard {...defaultProps} task={task} />);

			expect(screen.getByText('Project / Feature')).toBeInTheDocument();
		});

		it('should not render path badge when task has empty path', () => {
			const task = createMockTask({ path: [] });
			render(<TaskCard {...defaultProps} task={task} />);

			expect(screen.queryByTitle(/\//)).not.toBeInTheDocument();
		});

		it('should apply strikethrough style when task is checked', () => {
			const task = createMockTask({ isChecked: true });
			render(<TaskCard {...defaultProps} task={task} />);

			const titleElement = screen.getByText('Test Task');
			// The line-through class is on a parent span wrapping MarkdownText
			const parentSpan = titleElement.closest('span.line-through');
			expect(parentSpan).toBeInTheDocument();
		});

		it('should not apply strikethrough style when task is not checked', () => {
			const task = createMockTask({ isChecked: false });
			render(<TaskCard {...defaultProps} task={task} />);

			const titleElement = screen.getByText('Test Task');
			// The line-through class should not be present
			const parentSpan = titleElement.closest('span.line-through');
			expect(parentSpan).toBeNull();
		});
	});

	describe('Task Interaction', () => {
		it('should call onClick when card is clicked', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();
			render(<TaskCard {...defaultProps} onClick={onClick} />);

			await user.click(screen.getByRole('button'));

			expect(onClick).toHaveBeenCalledWith(defaultProps.task);
		});

		it('should call onClick when Enter is pressed', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();
			render(<TaskCard {...defaultProps} onClick={onClick} />);

			const card = screen.getByRole('button');
			card.focus();
			await user.keyboard('{Enter}');

			expect(onClick).toHaveBeenCalledWith(defaultProps.task);
		});

		it('should call onClick when Space is pressed', async () => {
			const user = userEvent.setup();
			const onClick = vi.fn();
			render(<TaskCard {...defaultProps} onClick={onClick} />);

			const card = screen.getByRole('button');
			card.focus();
			await user.keyboard(' ');

			expect(onClick).toHaveBeenCalledWith(defaultProps.task);
		});

		it('should not throw when onClick is not provided', async () => {
			const user = userEvent.setup();
			render(<TaskCard task={defaultProps.task} />);

			await user.click(screen.getByRole('button'));
			// Should not throw
		});
	});
});
