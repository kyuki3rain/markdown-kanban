import { err, ok, type Result } from 'neverthrow';
import type { KanbanConfig } from '../../domain/ports/configProvider';
import type { RemarkClient } from '../../infrastructure/clients/remarkClient';
import type { VscodeDocumentClient } from '../../infrastructure/clients/vscodeDocumentClient';

/**
 * 設定更新エラー
 */
export class UpdateConfigError extends Error {
	readonly _tag = 'UpdateConfigError';
	constructor(message: string) {
		super(message);
		this.name = 'UpdateConfigError';
	}
}

/**
 * 設定更新入力（部分的な設定のみ受け付け）
 */
export interface UpdateConfigInput {
	filterPaths?: string[];
	sortBy?: 'markdown' | 'priority' | 'due' | 'alphabetical';
}

/**
 * 設定更新ユースケース
 * フロントマターのkanbanセクションを更新する
 */
export class UpdateConfigUseCase {
	constructor(
		private readonly remarkClient: RemarkClient,
		private readonly documentClient: VscodeDocumentClient,
	) {}

	/**
	 * 設定を更新する
	 */
	async execute(
		updates: UpdateConfigInput,
	): Promise<Result<KanbanConfig['filterPaths'], UpdateConfigError>> {
		// ドキュメントのテキストを取得
		const textResult = await this.documentClient.getCurrentDocumentText();
		if (textResult.isErr()) {
			return err(new UpdateConfigError(textResult.error.message));
		}

		const markdown = textResult.value;

		// フロントマターを更新
		const updatedMarkdown = this.remarkClient.updateFrontmatter(
			markdown,
			updates as Record<string, unknown>,
		);

		// ドキュメントを更新
		const replaceResult = await this.documentClient.replaceDocumentText(updatedMarkdown);
		if (replaceResult.isErr()) {
			return err(new UpdateConfigError(replaceResult.error.message));
		}

		return ok(updates.filterPaths ?? []);
	}
}
