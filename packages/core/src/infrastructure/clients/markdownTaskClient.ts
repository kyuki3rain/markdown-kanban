import type { Result } from 'neverthrow';
import { RemarkClient } from './remarkClient';
import {
	MarkdownParser,
	MarkdownParseError,
	type ParseResult,
	type ParsedTask,
	type FrontmatterConfig,
} from './markdownParser';
import { MarkdownSerializer, SerializerError, type TaskEdit, type CreateTaskInfo } from './markdownSerializer';

// Re-export types for backward compatibility
export {
	type ParsedTask,
	type FrontmatterConfig,
	type ParseResult,
	MarkdownParseError,
	type TaskEdit,
	type CreateTaskInfo,
	SerializerError,
};

/**
 * MarkdownTaskClient
 * Markdownファイルからタスクを抽出・編集するクライアント
 *
 * このクラスはファサードとして機能し、内部で以下のクラスに処理を委譲する:
 * - MarkdownParser: パース責務
 * - MarkdownSerializer: シリアライズ責務
 * - TaskLineEditor: 行編集責務（MarkdownSerializerが使用）
 */
export class MarkdownTaskClient {
	private readonly parser: MarkdownParser;
	private readonly serializer: MarkdownSerializer;

	constructor(remarkClient: RemarkClient = new RemarkClient()) {
		this.parser = new MarkdownParser(remarkClient);
		this.serializer = new MarkdownSerializer(this.parser);
	}

	/**
	 * Markdownをパースしてタスクを抽出する
	 */
	parse(markdown: string): Result<ParseResult, MarkdownParseError> {
		return this.parser.parse(markdown);
	}

	/**
	 * 編集を適用する
	 */
	applyEdit(markdown: string, edit: TaskEdit): Result<string, SerializerError> {
		return this.serializer.applyEdit(markdown, edit);
	}
}
