import { describe, expect, it } from 'vitest';
import { RemarkClient } from './remarkClient';

describe('RemarkClient', () => {
	const client = new RemarkClient();

	describe('parseToAst', () => {
		it('MarkdownをASTにパースする', () => {
			const markdown = '# Heading\n\n- [ ] Task';
			const ast = client.parseToAst(markdown);

			expect(ast.type).toBe('root');
			expect(ast.children).toHaveLength(2);
		});
	});

	describe('parseFrontmatter', () => {
		it('フロントマターを抽出する', () => {
			const markdown = `---
title: Test
---

# Content`;
			const result = client.parseFrontmatter(markdown);

			expect(result.data).toEqual({ title: 'Test' });
			expect(result.content).toBe('\n# Content');
		});

		it('フロントマターがない場合は空のデータを返す', () => {
			const markdown = '# No frontmatter';
			const result = client.parseFrontmatter(markdown);

			expect(result.data).toEqual({});
			expect(result.content).toBe('# No frontmatter');
		});
	});

	describe('countFrontmatterLines', () => {
		it('フロントマターの行数を計算する', () => {
			const original = `---
title: Test
---

# Content`;
			// parseFrontmatterが返すcontentを使用
			// gray-matterはフロントマター（---で囲まれた部分）のみを削除し、
			// その後の空行はcontentに含まれる（"\n# Content"）
			const { content } = client.parseFrontmatter(original);
			const lines = client.countFrontmatterLines(original, content);

			// フロントマターは3行（---, title: Test, ---）
			// その後の空行（1行）はcontentに含まれる
			expect(lines).toBe(3);
		});

		it('フロントマターがない場合は0を返す', () => {
			const content = '# No frontmatter';
			const lines = client.countFrontmatterLines(content, content);

			expect(lines).toBe(0);
		});
	});

	describe('updateFrontmatter', () => {
		it('既存のkanbanセクションにフィールドを追加する', () => {
			const markdown = `---
kanban:
  statuses:
    - todo
    - done
---

# Tasks`;
			const result = client.updateFrontmatter(markdown, { filterPaths: ['Project / Feature'] });

			expect(result).toContain('filterPaths:');
			expect(result).toContain('- Project / Feature');
			expect(result).toContain('statuses:');
			expect(result).toContain('# Tasks');
		});

		it('kanbanセクションがない場合は新規作成する', () => {
			const markdown = `---
title: Test
---

# Tasks`;
			const result = client.updateFrontmatter(markdown, { filterPaths: ['Path A'] });

			expect(result).toContain('kanban:');
			expect(result).toContain('filterPaths:');
			expect(result).toContain('- Path A');
			expect(result).toContain('title: Test');
		});

		it('フロントマターがない場合は新規作成する', () => {
			const markdown = '# Tasks\n\n- [ ] Task 1';
			const result = client.updateFrontmatter(markdown, { filterPaths: ['New Path'] });

			expect(result).toContain('---');
			expect(result).toContain('kanban:');
			expect(result).toContain('filterPaths:');
			expect(result).toContain('- New Path');
			expect(result).toContain('# Tasks');
		});

		it('非kanbanフィールドを保持する', () => {
			const markdown = `---
title: My Document
author: Test
kanban:
  statuses:
    - todo
---

# Content`;
			const result = client.updateFrontmatter(markdown, { filterPaths: ['Path'] });

			expect(result).toContain('title: My Document');
			expect(result).toContain('author: Test');
			expect(result).toContain('filterPaths:');
		});

		it('undefinedの値を削除する', () => {
			const markdown = `---
kanban:
  filterPaths:
    - Old Path
  statuses:
    - todo
---

# Tasks`;
			const result = client.updateFrontmatter(markdown, { filterPaths: undefined });

			expect(result).not.toContain('filterPaths:');
			expect(result).toContain('statuses:');
		});

		it('既存のフィールドを上書きする', () => {
			const markdown = `---
kanban:
  filterPaths:
    - Old Path
---

# Tasks`;
			const result = client.updateFrontmatter(markdown, { filterPaths: ['New Path'] });

			expect(result).toContain('- New Path');
			expect(result).not.toContain('- Old Path');
		});

		it('空配列を正しく処理する', () => {
			const markdown = `---
kanban:
  filterPaths:
    - Some Path
---

# Tasks`;
			const result = client.updateFrontmatter(markdown, { filterPaths: [] });

			expect(result).toContain('filterPaths: []');
		});
	});
});
