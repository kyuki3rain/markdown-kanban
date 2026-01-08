import { err, ok } from 'neverthrow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemarkClient } from '../../infrastructure/clients/remarkClient';
import type { VscodeDocumentClient } from '../../infrastructure/clients/vscodeDocumentClient';
import {
	DocumentEditError,
	NoActiveEditorError,
} from '../../infrastructure/clients/vscodeDocumentClient';
import { UpdateConfigError, UpdateConfigUseCase } from './updateConfigUseCase';

describe('UpdateConfigUseCase', () => {
	let useCase: UpdateConfigUseCase;
	let mockRemarkClient: RemarkClient;
	let mockDocumentClient: VscodeDocumentClient;

	const mockMarkdown = `---
kanban:
  statuses:
    - todo
    - done
---

# Tasks

- [ ] Task 1
`;

	const mockUpdatedMarkdown = `---
kanban:
  statuses:
    - todo
    - done
  filterPaths:
    - Project / Feature
---

# Tasks

- [ ] Task 1
`;

	beforeEach(() => {
		mockRemarkClient = {
			updateFrontmatter: vi.fn().mockReturnValue(mockUpdatedMarkdown),
		} as unknown as RemarkClient;

		mockDocumentClient = {
			getCurrentDocumentText: vi.fn().mockResolvedValue(ok(mockMarkdown)),
			replaceDocumentText: vi.fn().mockResolvedValue(ok(undefined)),
			getActiveEditorUri: vi.fn(),
			getDocumentText: vi.fn(),
			getCurrentDocumentUri: vi.fn(),
		} as unknown as VscodeDocumentClient;

		useCase = new UpdateConfigUseCase(mockRemarkClient, mockDocumentClient);
	});

	describe('execute', () => {
		it('filterPathsの更新に成功した場合、更新されたfilterPathsを返す', async () => {
			const filterPaths = ['Project / Feature'];

			const result = await useCase.execute({ filterPaths });

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual(filterPaths);
			}
			expect(mockDocumentClient.getCurrentDocumentText).toHaveBeenCalled();
			expect(mockRemarkClient.updateFrontmatter).toHaveBeenCalledWith(mockMarkdown, {
				filterPaths,
			});
			expect(mockDocumentClient.replaceDocumentText).toHaveBeenCalledWith(mockUpdatedMarkdown);
		});

		it('filterPathsが空の場合、空配列を返す', async () => {
			const result = await useCase.execute({ filterPaths: [] });

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it('filterPathsが未指定の場合、空配列を返す', async () => {
			const result = await useCase.execute({});

			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value).toEqual([]);
			}
		});

		it('sortByの更新に成功した場合、フロントマターが更新される', async () => {
			const result = await useCase.execute({ sortBy: 'priority' });

			expect(result.isOk()).toBe(true);
			expect(mockRemarkClient.updateFrontmatter).toHaveBeenCalledWith(mockMarkdown, {
				sortBy: 'priority',
			});
			expect(mockDocumentClient.replaceDocumentText).toHaveBeenCalledWith(mockUpdatedMarkdown);
		});

		it('filterPathsとsortByを同時に更新できる', async () => {
			const result = await useCase.execute({
				filterPaths: ['Project / Feature'],
				sortBy: 'due',
			});

			expect(result.isOk()).toBe(true);
			expect(mockRemarkClient.updateFrontmatter).toHaveBeenCalledWith(mockMarkdown, {
				filterPaths: ['Project / Feature'],
				sortBy: 'due',
			});
		});

		it('ドキュメントテキスト取得に失敗した場合、UpdateConfigErrorを返す', async () => {
			const error = new NoActiveEditorError('No active document');
			vi.mocked(mockDocumentClient.getCurrentDocumentText).mockResolvedValue(err(error));

			const result = await useCase.execute({ filterPaths: ['path'] });

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(UpdateConfigError);
				expect(result.error.message).toBe('No active document');
			}
		});

		it('ドキュメント更新に失敗した場合、UpdateConfigErrorを返す', async () => {
			const error = new DocumentEditError('Failed to update document');
			vi.mocked(mockDocumentClient.replaceDocumentText).mockResolvedValue(err(error));

			const result = await useCase.execute({ filterPaths: ['path'] });

			expect(result.isErr()).toBe(true);
			if (result.isErr()) {
				expect(result.error).toBeInstanceOf(UpdateConfigError);
				expect(result.error.message).toBe('Failed to update document');
			}
		});
	});
});
