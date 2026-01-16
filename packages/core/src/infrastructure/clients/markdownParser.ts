import type { Heading, List, ListItem, Paragraph, RootContent, Text } from 'mdast';
import { ok, type Result } from 'neverthrow';
import type { TaskMetadata } from '../../domain/entities/task';
import { Path } from '../../domain/valueObjects/path';
import { Status } from '../../domain/valueObjects/status';
import { generateTaskId } from '../../domain/valueObjects/taskId';
import { RemarkClient } from './remarkClient';

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
	filterPaths?: string[];
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
 * MarkdownParser
 * Markdownファイルからタスクを抽出する責務を担当
 */
export class MarkdownParser {
	private static readonly DEFAULT_STATUS = 'todo';
	private static readonly DEFAULT_DONE_STATUS = 'done';
	private static readonly KEY_VALUE_PATTERN = /^([^:]+):\s*(.+)$/;

	constructor(private readonly remarkClient: RemarkClient = new RemarkClient()) {}

	/**
	 * Markdownをパースしてタスクを抽出する
	 */
	parse(markdown: string): Result<ParseResult, MarkdownParseError> {
		// フロントマターを抽出
		const { content, data } = this.remarkClient.parseFrontmatter(markdown);
		const config = this.extractConfig(data);

		// フロントマターを除いた行のオフセットを計算
		const frontmatterLineCount = this.remarkClient.countFrontmatterLines(markdown, content);

		// Markdownをパース
		const tree = this.remarkClient.parseToAst(content);

		// 見出しスタックを初期化
		const headingStack: { level: number; text: string }[] = [];
		const headings: Path[] = [];
		const tasks: ParsedTask[] = [];
		const warnings: string[] = [];

		// ASTを走査
		this.walkNodes(
			tree.children,
			headingStack,
			headings,
			tasks,
			frontmatterLineCount,
			content,
			config,
		);

		// 重複タスクを検出
		this.detectDuplicates(tasks, warnings);

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
	private extractConfig(data: Record<string, unknown>): FrontmatterConfig | undefined {
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
			filterPaths: Array.isArray(config.filterPaths)
				? config.filterPaths.filter((p): p is string => typeof p === 'string')
				: undefined,
		};
	}

	/**
	 * ASTノードを走査
	 */
	private walkNodes(
		nodes: RootContent[],
		headingStack: { level: number; text: string }[],
		headings: Path[],
		tasks: ParsedTask[],
		lineOffset: number,
		content: string,
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
				this.processHeading(node, headingStack, headings);
				continue;
			}

			// リストを処理
			if (node.type === 'list') {
				this.processList(node, headingStack, tasks, lineOffset, content, config, isInBlockquote);
			}
		}
	}

	/**
	 * 見出しを処理
	 */
	private processHeading(
		heading: Heading,
		headingStack: { level: number; text: string }[],
		headings: Path[],
	): void {
		const text = this.extractTextFromNodes(heading.children);
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
	private processList(
		list: List,
		headingStack: { level: number; text: string }[],
		tasks: ParsedTask[],
		lineOffset: number,
		content: string,
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
						this.processList(
							child,
							headingStack,
							tasks,
							lineOffset,
							content,
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
			const task = this.extractTask(item, headingStack, lineOffset, content, config);
			if (task) {
				tasks.push(task);
			}
		}
	}

	/**
	 * リストアイテムからタスクを抽出
	 */
	private extractTask(
		item: ListItem,
		headingStack: { level: number; text: string }[],
		lineOffset: number,
		content: string,
		config?: FrontmatterConfig,
	): ParsedTask | null {
		const isChecked = item.checked === true;

		// タイトルを抽出（最初のParagraphから、元のMarkdownソースを保持）
		let title = '';
		let metadata: TaskMetadata = {};
		let endLine = item.position?.end.line ?? 0;

		for (const child of item.children) {
			if (child.type === 'paragraph' && title === '') {
				// positionからオリジナルのMarkdownを抽出
				if (
					child.position?.start.offset !== undefined &&
					child.position?.end.offset !== undefined
				) {
					let rawTitle = content
						.slice(child.position.start.offset, child.position.end.offset)
						.trim();
					// チェックボックスパターンを除去（mdastのParagraphにはチェックボックスが含まれる）
					rawTitle = rawTitle.replace(/^\[[ xX]\]\s*/, '');
					title = rawTitle;
				} else {
					// フォールバック: テキスト抽出
					title = this.extractTextFromNodes(child.children);
				}
			} else if (child.type === 'list') {
				// 子リストからメタデータを抽出
				const extracted = this.extractMetadata(child);
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
		const statusValue = this.determineStatus(metadata.status, isChecked, config);
		const statusResult = Status.create(statusValue);
		if (statusResult.isErr()) {
			return null;
		}
		const status = statusResult.value;

		// メタデータからstatusを削除（エンティティのstatusに移動したため）
		const { status: _status, ...otherMetadata } = metadata;

		// IDを生成（ハッシュベース）
		const id = generateTaskId(path, title);

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
	private determineStatus(
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
	private extractMetadata(list: List): { metadata: TaskMetadata } {
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

				const text = this.extractTextFromNodes(child.children).trim();
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
	private extractTextFromNodes(
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
				text += this.extractTextFromNodes(node.children as Array<Text>);
			}
		}

		return text;
	}

	/**
	 * 重複タスクを検出
	 */
	private detectDuplicates(tasks: ParsedTask[], warnings: string[]): void {
		const seen = new Map<string, { lines: number[]; title: string; path: string }>();

		for (const task of tasks) {
			const key = task.id;
			const existing = seen.get(key);

			if (existing) {
				existing.lines.push(task.startLine);
			} else {
				seen.set(key, {
					lines: [task.startLine],
					title: task.title,
					path: task.path.toString(),
				});
			}
		}

		for (const { lines, title, path } of seen.values()) {
			if (lines.length > 1) {
				warnings.push(`⚠ 重複タスクを検出: "${title}" (${path}) - ${lines.join('行目, ')}行目`);
			}
		}
	}
}
