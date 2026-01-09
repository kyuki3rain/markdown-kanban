/**
 * EOL (End Of Line) Utility
 *
 * CRLF/LFを統一的に扱うためのユーティリティ。
 * Windows環境のCRLF (\r\n) とUnix環境のLF (\n) の両方を正しく処理し、
 * 元の改行コードを保持した編集を可能にする。
 */

/**
 * 改行コードの種類
 */
export type EolType = 'LF' | 'CRLF';

/**
 * EOL検出結果
 */
export interface EolInfo {
	/** 検出された改行コードの種類 */
	type: EolType;
	/** 実際の改行文字列 ('\n' または '\r\n') */
	sequence: string;
}

const EOL_SEQUENCES: Record<EolType, string> = {
	LF: '\n',
	CRLF: '\r\n',
};

/**
 * テキスト内の改行コードを検出する。
 * CRLFが含まれている場合はCRLFを返し、それ以外はLFを返す（デフォルト）。
 *
 * @param text - 検査対象のテキスト
 * @returns EolInfo（検出された改行コードの種類と文字列）
 */
export function detectEol(text: string): EolInfo {
	// CRLFを先にチェック（より具体的なパターン）
	if (text.includes('\r\n')) {
		return { type: 'CRLF', sequence: '\r\n' };
	}
	// 改行がない場合もLFをデフォルトとする
	return { type: 'LF', sequence: '\n' };
}

/**
 * テキストを行に分割する。
 * CRLF (\r\n) と LF (\n) の両方を正しく処理し、
 * 分割後の行に \r が残らないようにする。
 *
 * @param text - 分割対象のテキスト
 * @returns 行の配列（改行文字を含まない）
 */
export function splitLines(text: string): string[] {
	return text.split(/\r?\n/);
}

/**
 * 行を指定された改行コードで結合する。
 *
 * @param lines - 結合する行の配列
 * @param eol - 使用する改行コード（EolInfoまたはEolType）
 * @returns 結合されたテキスト
 */
export function joinLines(lines: string[], eol: EolInfo | EolType): string {
	const sequence = typeof eol === 'string' ? EOL_SEQUENCES[eol] : eol.sequence;
	return lines.join(sequence);
}

/**
 * テキストを行単位で処理し、元の改行コードを保持して結合する。
 * detectEol + splitLines + processor + joinLines を一括で行う便利関数。
 *
 * @param text - 処理対象のテキスト
 * @param processor - 行配列を処理する関数
 * @returns 処理後のテキスト（元の改行コードを保持）
 */
export function processLines(text: string, processor: (lines: string[]) => string[]): string {
	const eolInfo = detectEol(text);
	const lines = splitLines(text);
	const processedLines = processor(lines);
	return joinLines(processedLines, eolInfo);
}
