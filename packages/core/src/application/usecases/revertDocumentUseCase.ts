import type { Result } from 'neverthrow';
import type {
	DocumentOperationError,
	DocumentService,
	NoActiveDocumentError,
} from '../ports/documentService';

/**
 * ドキュメント変更破棄ユースケース
 */
export class RevertDocumentUseCase {
	constructor(private readonly documentService: DocumentService) {}

	/**
	 * ドキュメントの変更を破棄する
	 */
	async execute(): Promise<Result<void, NoActiveDocumentError | DocumentOperationError>> {
		return this.documentService.revertDocument();
	}
}
