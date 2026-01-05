import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownText } from './MarkdownText';

describe('MarkdownText', () => {
	describe('Markdown Rendering', () => {
		it('should render bold text', () => {
			render(<MarkdownText>**bold text**</MarkdownText>);

			const boldElement = screen.getByText('bold text');
			expect(boldElement.tagName).toBe('STRONG');
		});

		it('should render italic text', () => {
			render(<MarkdownText>*italic text*</MarkdownText>);

			const italicElement = screen.getByText('italic text');
			expect(italicElement.tagName).toBe('EM');
		});

		it('should render inline code', () => {
			render(<MarkdownText>`code`</MarkdownText>);

			const codeElement = screen.getByText('code');
			expect(codeElement.tagName).toBe('CODE');
		});

		it('should render strikethrough text', () => {
			render(<MarkdownText>~~deleted~~</MarkdownText>);

			const delElement = screen.getByText('deleted');
			expect(delElement.tagName).toBe('DEL');
		});

		it('should render links with target="_blank"', () => {
			render(<MarkdownText>[link](https://example.com)</MarkdownText>);

			const linkElement = screen.getByRole('link', { name: 'link' });
			expect(linkElement).toHaveAttribute('href', 'https://example.com');
			expect(linkElement).toHaveAttribute('target', '_blank');
			expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
		});

		it('should render plain text', () => {
			render(<MarkdownText>plain text</MarkdownText>);

			expect(screen.getByText('plain text')).toBeInTheDocument();
		});

		it('should render combined markdown elements', () => {
			render(<MarkdownText>**bold** and *italic* and `code`</MarkdownText>);

			expect(screen.getByText('bold').tagName).toBe('STRONG');
			expect(screen.getByText('italic').tagName).toBe('EM');
			expect(screen.getByText('code').tagName).toBe('CODE');
		});
	});
});
