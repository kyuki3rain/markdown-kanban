import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PathBadge } from './PathBadge';

describe('PathBadge', () => {
	it('should render path segments joined with separator', () => {
		render(<PathBadge path={['Project', 'Feature', 'Task']} />);

		expect(screen.getByText('Project / Feature / Task')).toBeInTheDocument();
	});

	it('should return null when path is empty', () => {
		const { container } = render(<PathBadge path={[]} />);

		expect(container.firstChild).toBeNull();
	});

	it('should set title attribute with full path', () => {
		render(<PathBadge path={['Project', 'Feature']} />);

		expect(screen.getByTitle('Project / Feature')).toBeInTheDocument();
	});

	it('should apply custom className', () => {
		render(<PathBadge path={['Project']} className="custom-class" />);

		expect(screen.getByText('Project')).toHaveClass('custom-class');
	});

	it('should render single path segment', () => {
		render(<PathBadge path={['SingleItem']} />);

		expect(screen.getByText('SingleItem')).toBeInTheDocument();
	});
});
