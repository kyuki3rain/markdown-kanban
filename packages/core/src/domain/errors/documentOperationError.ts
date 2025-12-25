/**
 * ドキュメント操作エラー
 * 読み込み、パース、編集生成、書き込みのいずれかで発生した操作エラー
 */
export class DocumentOperationError extends Error {
	readonly _tag = 'DocumentOperationError';

	constructor(message = 'ドキュメントの操作に失敗しました') {
		super(message);
		this.name = 'DocumentOperationError';
	}
}
