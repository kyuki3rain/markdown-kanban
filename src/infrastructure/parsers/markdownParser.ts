import matter from 'gray-matter';
import type { Heading, List, ListItem, Paragraph, Root, RootContent, Text } from 'mdast';
import { ok, type Result } from 'neverthrow';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { TaskMetadata } from '../../domain/entities/task';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';

/**
 * パース結果のタスク情報（行番号付き）
 */
export interface ParsedTask {
	id: string;
	title: string;
	status: Status;
	path: Path;
	isChecked: boolean;
	metadata: TaskMetadata;
	startLine: number;
	endLine: number;
}

/**
 * フロントマターから読み取ったKanban設定
 */
export interface FrontmatterConfig {
	statuses?: string[];
	doneStatuses?: string[];
	defaultStatus?: string;
	defaultDoneStatus?: string;
	sortBy?: string;
	syncCheckboxWithDone?: boolean;
}

/**
 * パース結果
 */
export interface ParseResult {
	tasks: ParsedTask[];
	headings: Path[];
	warnings: string[];
	config?: FrontmatterConfig;
}

/**
 * パースエラー
 */
export class MarkdownParseError extends Error {
	readonly _tag = 'MarkdownParseError';
	constructor(message: string) {
		super(message);
		this.name = 'MarkdownParseError';
	}
}

/**
 * Markdownパーサー
 * Markdownファイルからタスクを抽出する
 */
export class MarkdownParser {
	private static readonly DEFAULT_STATUS = 'todo';
	private static readonly DEFAULT_DONE_STATUS = 'done';
	private static readonly KEY_VALUE_PATTERN = /^([^:]+):\s*(.+)$/;

	/**
	 * Markdownをパースしてタスクを抽出する
	 */
	static parse(markdown: string): Result<ParseResult, MarkdownParseError> {
		// フロントマターを抽出
		const { content, data } = matter(markdown);
		const config = MarkdownParser.extractConfig(data);

		// フロントマターを除いた行のオフセットを計算
		const frontmatterLineCount = MarkdownParser.countFrontmatterLines(markdown, content);

		// Markdownをパース
		const processor = remark().use(remarkGfm);
		const tree = processor.parse(content) as Root;

		// 見出しスタックを初期化
		const headingStack: { level: number; text: string }[] = [];
		const headings: Path[] = [];
		const tasks: ParsedTask[] = [];
		const warnings: string[] = [];

		// ASTを走査
		MarkdownParser.walkNodes(
			tree.children,
			headingStack,
			headings,
			tasks,
			frontmatterLineCount,
			config,
		);

		// 重複タスクを検出
		MarkdownParser.detectDuplicates(tasks, warnings);

		return ok({
			tasks,
			headings,
			warnings,
			config,
		});
	}

	/**
	 * フロントマターからKanban設定を抽出
	 */
	private static extractConfig(data: Record<string, unknown>): FrontmatterConfig | undefined {
		const kanban = data.kanban;
		if (!kanban || typeof kanban !== 'object') {
			return undefined;
		}

		const config = kanban as Record<string, unknown>;
		return {
			statuses: Array.isArray(config.statuses) ? config.statuses : undefined,
			doneStatuses: Array.isArray(config.doneStatuses) ? config.doneStatuses : undefined,
			defaultStatus: typeof config.defaultStatus === 'string' ? config.defaultStatus : undefined,
			defaultDoneStatus:
				typeof config.defaultDoneStatus === 'string' ? config.defaultDoneStatus : undefined,
			sortBy: typeof config.sortBy === 'string' ? config.sortBy : undefined,
			syncCheckboxWithDone:
				typeof config.syncCheckboxWithDone === 'boolean' ? config.syncCheckboxWithDone : undefined,
		};
	}

	/**
	 * フロントマターの行数を計算
	 */
	private static countFrontmatterLines(original: string, content: string): number {
		if (original === content) {
			return 0;
		}
		// 元のMarkdownからcontentを引いた部分がフロントマター
		const frontmatter = original.slice(0, original.length - content.length);
		return frontmatter.split('\n').length - 1;
	}

	/**
	 * ASTノードを走査
	 */
	private static walkNodes(
		nodes: RootContent[],
		headingStack: { level: number; text: string }[],
		headings: Path[],
		tasks: ParsedTask[],
		lineOffset: number,
		config?: FrontmatterConfig,
		isInBlockquote = false,
	): void {
		for (const node of nodes) {
			// 引用内は無視
			if (node.type === 'blockquote') {
				continue;
			}

			// コードブロック内は無視
			if (node.type === 'code') {
				continue;
			}

			// 見出しを処理
			if (node.type === 'heading') {
				MarkdownParser.processHeading(node, headingStack, headings);
				continue;
			}

			// リストを処理
			if (node.type === 'list') {
				MarkdownParser.processList(node, headingStack, tasks, lineOffset, config, isInBlockquote);
			}
		}
	}

	/**
	 * 見出しを処理
	 */
	private static processHeading(
		heading: Heading,
		headingStack: { level: number; text: string }[],
		headings: Path[],
	): void {
		const text = MarkdownParser.extractTextFromNodes(heading.children);
		const level = heading.depth;

		// 現在のレベル以上の見出しを削除
		while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
			headingStack.pop();
		}

		// 新しい見出しをスタックに追加
		headingStack.push({ level, text });

		// パスを生成
		const segments = headingStack.map((h) => h.text);
		const path = Path.create(segments);
		headings.push(path);
	}

	/**
	 * リストを処理
	 */
	private static processList(
		list: List,
		headingStack: { level: number; text: string }[],
		tasks: ParsedTask[],
		lineOffset: number,
		config?: FrontmatterConfig,
		isInBlockquote = false,
	): void {
		for (const item of list.children) {
			if (item.type !== 'listItem') {
				continue;
			}

			// チェックボックスでない場合はスキップ
			if (item.checked === null || item.checked === undefined) {
				// 子リストがあれば処理（通常のリスト内のチェックボックス）
				for (const child of item.children) {
					if (child.type === 'list') {
						MarkdownParser.processList(
							child,
							headingStack,
							tasks,
							lineOffset,
							config,
							isInBlockquote,
						);
					}
				}
				continue;
			}

			// 引用内のチェックボックスは無視
			if (isInBlockquote) {
				continue;
			}

			// タスクを抽出
			const task = MarkdownParser.extractTask(item, headingStack, lineOffset, config);
			if (task) {
				tasks.push(task);
			}
		}
	}

	/**
	 * リストアイテムからタスクを抽出
	 */
	private static extractTask(
		item: ListItem,
		headingStack: { level: number; text: string }[],
		lineOffset: number,
		config?: FrontmatterConfig,
	): ParsedTask | null {
		const isChecked = item.checked === true;

		// タイトルを抽出（最初のParagraphから）
		let title = '';
		let metadata: TaskMetadata = {};
		let endLine = item.position?.end.line ?? 0;

		for (const child of item.children) {
			if (child.type === 'paragraph' && title === '') {
				title = MarkdownParser.extractTextFromNodes(child.children);
			} else if (child.type === 'list') {
				// 子リストからメタデータを抽出
				const extracted = MarkdownParser.extractMetadata(child);
				metadata = extracted.metadata;
				if (child.position?.end.line) {
					endLine = child.position.end.line;
				}
			}
		}

		if (!title) {
			return null;
		}

		// パスを生成
		const segments = headingStack.map((h) => h.text);
		const path = Path.create(segments);

		// ステータスを決定
		const statusValue = MarkdownParser.determineStatus(metadata.status, isChecked, config);
		const statusResult = Status.create(statusValue);
		if (statusResult.isErr()) {
			return null;
		}
		const status = statusResult.value;

		// メタデータからstatusを削除（エンティティのstatusに移動したため）
		const { status: _status, ...otherMetadata } = metadata;

		// IDを生成
		const id = MarkdownParser.generateTaskId(path, title);

		const startLine = (item.position?.start.line ?? 0) + lineOffset;
		const actualEndLine = endLine + lineOffset;

		return {
			id,
			title,
			status,
			path,
			isChecked,
			metadata: otherMetadata,
			startLine,
			endLine: actualEndLine,
		};
	}

	/**
	 * ステータスを決定する
	 */
	private static determineStatus(
		explicitStatus: string | undefined,
		isChecked: boolean,
		config?: FrontmatterConfig,
	): string {
		if (explicitStatus) {
			return explicitStatus;
		}

		if (isChecked) {
			return config?.defaultDoneStatus ?? MarkdownParser.DEFAULT_DONE_STATUS;
		}

		return config?.defaultStatus ?? MarkdownParser.DEFAULT_STATUS;
	}

	/**
	 * 子リストからメタデータを抽出
	 */
	private static extractMetadata(list: List): { metadata: TaskMetadata } {
		const metadata: TaskMetadata = {};

		for (const item of list.children) {
			if (item.type !== 'listItem') {
				continue;
			}

			// Paragraph内のテキストを取得
			for (const child of item.children) {
				if (child.type !== 'paragraph') {
					continue;
				}

				const text = MarkdownParser.extractTextFromNodes(child.children).trim();
				const match = text.match(MarkdownParser.KEY_VALUE_PATTERN);

				if (match) {
					const key = match[1].trim();
					const value = match[2].trim();

					// 空のキーは無視
					if (key) {
						metadata[key] = value;
					}
				}
			}
		}

		return { metadata };
	}

	/**
	 * ノードからテキストを抽出
	 */
	private static extractTextFromNodes(
		nodes: Array<
			RootContent | Text | Paragraph | { type: string; children?: unknown[]; value?: string }
		>,
	): string {
		let text = '';

		for (const node of nodes) {
			if (node.type === 'text') {
				text += (node as Text).value;
			} else if (node.type === 'inlineCode') {
				text += `\`${(node as { value: string }).value}\``;
			} else if ('children' in node && Array.isArray(node.children)) {
				text += MarkdownParser.extractTextFromNodes(node.children as Array<Text>);
			}
		}

		return text;
	}

	/**
	 * タスクIDを生成
	 */
	private static generateTaskId(path: Path, title: string): string {
		return `${path.toString()}::${title}`;
	}

	/**
	 * 重複タスクを検出
	 */
	private static detectDuplicates(tasks: ParsedTask[], warnings: string[]): void {
		const seen = new Map<string, number[]>();

		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			const key = task.id;

			if (seen.has(key)) {
				seen.get(key)?.push(task.startLine);
			} else {
				seen.set(key, [task.startLine]);
			}
		}

		for (const [id, lines] of seen.entries()) {
			if (lines.length > 1) {
				// IDからタイトルとパスを抽出
				const [pathStr, title] = id.split('::');
				warnings.push(`⚠ 重複タスクを検出: "${title}" (${pathStr}) - ${lines.join('行目, ')}行目`);
			}
		}
	}
}
