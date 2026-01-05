import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FloatingActions } from './FloatingActions';

describe('FloatingActions', () => {
	const defaultProps = {
		isDirty: false,
		onSave: vi.fn(),
		onRevert: vi.fn(),
	};

	describe('Visibility', () => {
		it('should not render when isDirty is false', () => {
			render(<FloatingActions {...defaultProps} />);

			expect(screen.queryByText('Save')).not.toBeInTheDocument();
			expect(screen.queryByText('Discard')).not.toBeInTheDocument();
		});

		it('should render Save and Discard buttons when isDirty is true', () => {
			render(<FloatingActions {...defaultProps} isDirty={true} />);

			expect(screen.getByText('Save')).toBeInTheDocument();
			expect(screen.getByText('Discard')).toBeInTheDocument();
		});
	});

	describe('Save Functionality', () => {
		it('should call onSave when Save button is clicked', async () => {
			const user = userEvent.setup();
			const onSave = vi.fn();
			render(<FloatingActions {...defaultProps} isDirty={true} onSave={onSave} />);

			await user.click(screen.getByText('Save'));

			expect(onSave).toHaveBeenCalledTimes(1);
		});
	});

	describe('Discard Functionality', () => {
		it('should call onRevert when Discard button is clicked', async () => {
			const user = userEvent.setup();
			const onRevert = vi.fn();
			render(<FloatingActions {...defaultProps} isDirty={true} onRevert={onRevert} />);

			await user.click(screen.getByText('Discard'));

			expect(onRevert).toHaveBeenCalledTimes(1);
		});
	});
});
