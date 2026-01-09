import { describe, expect, it } from 'vitest';
import { detectEol, joinLines, processLines, splitLines } from './index';

describe('EOL Utility', () => {
	describe('detectEol', () => {
		it('should detect LF line endings', () => {
			expect(detectEol('line1\nline2')).toEqual({ type: 'LF', sequence: '\n' });
		});

		it('should detect CRLF line endings', () => {
			expect(detectEol('line1\r\nline2')).toEqual({
				type: 'CRLF',
				sequence: '\r\n',
			});
		});

		it('should default to LF for text without line breaks', () => {
			expect(detectEol('single line')).toEqual({ type: 'LF', sequence: '\n' });
		});

		it('should default to LF for empty string', () => {
			expect(detectEol('')).toEqual({ type: 'LF', sequence: '\n' });
		});

		it('should detect CRLF when mixed with LF (CRLF takes precedence)', () => {
			expect(detectEol('line1\r\nline2\nline3')).toEqual({
				type: 'CRLF',
				sequence: '\r\n',
			});
		});

		it('should detect CRLF at end of file', () => {
			expect(detectEol('line1\r\n')).toEqual({
				type: 'CRLF',
				sequence: '\r\n',
			});
		});
	});

	describe('splitLines', () => {
		it('should split LF text correctly', () => {
			expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
		});

		it('should split CRLF text correctly without trailing \\r', () => {
			expect(splitLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
		});

		it('should handle mixed line endings', () => {
			expect(splitLines('a\r\nb\nc')).toEqual(['a', 'b', 'c']);
		});

		it('should handle empty string', () => {
			expect(splitLines('')).toEqual(['']);
		});

		it('should handle single line without line break', () => {
			expect(splitLines('single')).toEqual(['single']);
		});

		it('should handle trailing newline (LF)', () => {
			expect(splitLines('a\nb\n')).toEqual(['a', 'b', '']);
		});

		it('should handle trailing newline (CRLF)', () => {
			expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b', '']);
		});

		it('should handle multiple consecutive newlines (LF)', () => {
			expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
		});

		it('should handle multiple consecutive newlines (CRLF)', () => {
			expect(splitLines('a\r\n\r\nb')).toEqual(['a', '', 'b']);
		});
	});

	describe('joinLines', () => {
		it('should join with LF using EolType', () => {
			expect(joinLines(['a', 'b'], 'LF')).toBe('a\nb');
		});

		it('should join with CRLF using EolType', () => {
			expect(joinLines(['a', 'b'], 'CRLF')).toBe('a\r\nb');
		});

		it('should join with LF using EolInfo object', () => {
			expect(joinLines(['a', 'b'], { type: 'LF', sequence: '\n' })).toBe('a\nb');
		});

		it('should join with CRLF using EolInfo object', () => {
			expect(joinLines(['a', 'b'], { type: 'CRLF', sequence: '\r\n' })).toBe('a\r\nb');
		});

		it('should handle single element array', () => {
			expect(joinLines(['single'], 'LF')).toBe('single');
		});

		it('should handle empty array', () => {
			expect(joinLines([], 'LF')).toBe('');
		});

		it('should handle array with empty strings', () => {
			expect(joinLines(['a', '', 'b'], 'CRLF')).toBe('a\r\n\r\nb');
		});
	});

	describe('processLines', () => {
		it('should preserve LF endings', () => {
			const result = processLines('a\nb\nc', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('A\nB\nC');
		});

		it('should preserve CRLF endings', () => {
			const result = processLines('a\r\nb\r\nc', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('A\r\nB\r\nC');
		});

		it('should handle filtering lines', () => {
			const result = processLines('a\nb\nc', (lines) => lines.filter((l) => l !== 'b'));
			expect(result).toBe('a\nc');
		});

		it('should handle adding lines', () => {
			const result = processLines('a\r\nc', (lines) => [lines[0], 'b', lines[1]]);
			expect(result).toBe('a\r\nb\r\nc');
		});

		it('should handle text without line breaks', () => {
			const result = processLines('single', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('SINGLE');
		});

		it('should handle empty string', () => {
			const result = processLines('', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('');
		});

		it('should preserve trailing newline (LF)', () => {
			const result = processLines('a\nb\n', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('A\nB\n');
		});

		it('should preserve trailing newline (CRLF)', () => {
			const result = processLines('a\r\nb\r\n', (lines) => lines.map((l) => l.toUpperCase()));
			expect(result).toBe('A\r\nB\r\n');
		});
	});
});
