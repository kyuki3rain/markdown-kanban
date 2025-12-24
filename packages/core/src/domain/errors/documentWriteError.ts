/**
 * ドキュメント書き込みエラー
 * ファイルシステムエラーや競合状態など、書き込みに失敗した場合
 */
export class DocumentWriteError extends Error {
	readonly _tag = 'DocumentWriteError';

	constructor(message = 'ドキュメントの書き込みに失敗しました') {
		super(message);
		this.name = 'DocumentWriteError';
	}
}
