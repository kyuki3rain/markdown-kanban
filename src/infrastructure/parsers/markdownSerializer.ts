import { err, ok, type Result } from 'neverthrow';
import { Path } from '../../domain/valueObjects/path';
import type { Status } from '../../domain/valueObjects/status';
import { MarkdownParser, type ParsedTask } from './markdownParser';

/**
 * タスク作成情報
 */
export interface CreateTaskInfo {
	title: string;
	path: Path;
	status: Status;
}

/**
 * タスク編集情報
 */
export interface TaskEdit {
	/** 編集対象タスクのID（更新/削除時に使用） */
	taskId?: string;
	/** 新しいステータス */
	newStatus?: Status;
	/** 新しいタイトル */
	newTitle?: string;
	/** 削除フラグ */
	delete?: boolean;
	/** 新規作成情報 */
	create?: CreateTaskInfo;
	/** 完了扱いとするステータスのリスト */
	doneStatuses?: string[];
}

/**
 * シリアライザーエラー
 */
export class SerializerError extends Error {
	readonly _tag = 'SerializerError';
	constructor(message: string) {
		super(message);
		this.name = 'SerializerError';
	}
}

/**
 * Markdownシリアライザー
 * Markdownファイル内のタスクを編集する
 */
export class MarkdownSerializer {
	/**
	 * 編集を適用する
	 */
	static applyEdit(markdown: string, edit: TaskEdit): Result<string, SerializerError> {
		// 新規作成の場合
		if (edit.create) {
			return MarkdownSerializer.createTask(markdown, edit.create, edit.doneStatuses);
		}

		// 更新/削除の場合
		if (!edit.taskId) {
			return err(new SerializerError('タスクIDが指定されていません'));
		}

		// Markdownをパース
		const parseResult = MarkdownParser.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks } = parseResult.value;

		// タスクを検索
		const task = tasks.find((t) => t.id === edit.taskId);
		if (!task) {
			return err(new SerializerError(`タスクが見つかりません: ${edit.taskId}`));
		}

		// 削除の場合
		if (edit.delete) {
			return MarkdownSerializer.deleteTask(markdown, task);
		}

		// 更新の場合
		return MarkdownSerializer.updateTask(markdown, task, edit);
	}

	/**
	 * タスクを更新する
	 */
	private static updateTask(
		markdown: string,
		task: ParsedTask,
		edit: TaskEdit,
	): Result<string, SerializerError> {
		const lines = markdown.split('\n');

		// タイトル更新
		if (edit.newTitle) {
			const taskLine = lines[task.startLine - 1];
			const checkboxPattern = /^(\s*-\s*\[[ xX]\]\s*)(.+)$/;
			const match = taskLine.match(checkboxPattern);
			if (match) {
				lines[task.startLine - 1] = match[1] + edit.newTitle;
			}
		}

		// ステータス更新
		if (edit.newStatus) {
			const isDone = edit.doneStatuses?.includes(edit.newStatus.value) ?? false;

			// チェックボックスを更新
			const taskLine = lines[task.startLine - 1];
			if (isDone) {
				lines[task.startLine - 1] = taskLine.replace(/\[[ ]\]/, '[x]');
			} else {
				lines[task.startLine - 1] = taskLine.replace(/\[[xX]\]/, '[ ]');
			}

			// ステータス行を更新または追加
			let statusLineIndex = -1;
			for (let i = task.startLine; i < task.endLine; i++) {
				const line = lines[i];
				if (line.match(/^\s*-\s*status:\s*.+$/)) {
					statusLineIndex = i;
					break;
				}
			}

			if (statusLineIndex >= 0) {
				// 既存のステータス行を更新
				const indent = lines[statusLineIndex].match(/^(\s*)/)?.[1] ?? '  ';
				lines[statusLineIndex] = `${indent}- status: ${edit.newStatus.value}`;
			} else {
				// ステータス行を追加
				const indent = '  ';
				const statusLine = `${indent}- status: ${edit.newStatus.value}`;
				lines.splice(task.startLine, 0, statusLine);
			}
		}

		return ok(lines.join('\n'));
	}

	/**
	 * タスクを削除する
	 */
	private static deleteTask(markdown: string, task: ParsedTask): Result<string, SerializerError> {
		const lines = markdown.split('\n');

		// タスク行と子要素を削除
		const deleteCount = task.endLine - task.startLine + 1;
		lines.splice(task.startLine - 1, deleteCount);

		return ok(lines.join('\n'));
	}

	/**
	 * タスクを作成する
	 */
	private static createTask(
		markdown: string,
		create: CreateTaskInfo,
		doneStatuses?: string[],
	): Result<string, SerializerError> {
		const parseResult = MarkdownParser.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks, headings } = parseResult.value;
		const lines = markdown.split('\n');

		// チェックボックスの状態を決定
		const isDone = doneStatuses?.includes(create.status.value) ?? false;
		const checkbox = isDone ? '[x]' : '[ ]';

		// タスク行を生成
		const taskLines = [`- ${checkbox} ${create.title}`, `  - status: ${create.status.value}`];

		// 挿入位置を決定
		let insertLine: number;

		if (create.path.isRoot()) {
			// ルートパスの場合
			// 既存のルートタスクの後、または先頭
			const rootTasks = tasks.filter((t) => t.path.isRoot());
			if (rootTasks.length > 0) {
				const lastTask = rootTasks[rootTasks.length - 1];
				insertLine = lastTask.endLine;
			} else {
				// ルートタスクがない場合、最初の見出しの前か、ファイル末尾
				const firstHeadingLine = MarkdownSerializer.findFirstHeadingLine(lines);
				if (firstHeadingLine >= 0) {
					insertLine = firstHeadingLine;
				} else {
					insertLine = lines.length;
				}
			}
		} else {
			// パスが指定されている場合
			// 見出しを検索
			const headingExists = headings.some((h) => h.equals(create.path));
			if (!headingExists) {
				return err(new SerializerError(`見出しが見つかりません: ${create.path.toString()}`));
			}

			// パス配下のタスクを検索
			const pathTasks = tasks.filter((t) => t.path.equals(create.path));
			if (pathTasks.length > 0) {
				// 最後のタスクの後に挿入
				const lastTask = pathTasks[pathTasks.length - 1];
				insertLine = lastTask.endLine;
			} else {
				// タスクがない場合、見出しの直後に挿入
				insertLine = MarkdownSerializer.findInsertLineForPath(lines, create.path, headings);
			}
		}

		// 行を挿入
		lines.splice(insertLine, 0, ...taskLines);

		return ok(lines.join('\n'));
	}

	/**
	 * 最初の見出し行を見つける
	 */
	private static findFirstHeadingLine(lines: string[]): number {
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].match(/^#{1,6}\s+/)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * パスに対応する挿入位置を見つける
	 */
	private static findInsertLineForPath(
		lines: string[],
		targetPath: Path,
		_headings: Path[],
	): number {
		// 対象の見出しを見つける
		let targetHeadingLine = -1;
		let nextHeadingLine = -1;
		const targetDepth = targetPath.depth();

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headingMatch) {
				const level = headingMatch[1].length;
				const text = headingMatch[2].trim();

				// 対象の見出しかどうかチェック
				if (targetHeadingLine < 0) {
					// 見出しがターゲットパスの最後のセグメントと一致するかチェック
					if (text === targetPath.last()) {
						// 完全なパスをチェック
						const currentPath = MarkdownSerializer.buildPathAtLine(lines, i);
						if (currentPath?.equals(targetPath)) {
							targetHeadingLine = i;
						}
					}
				} else {
					// 次の見出し（同レベル以上）を探す
					if (level <= targetDepth) {
						nextHeadingLine = i;
						break;
					}
				}
			}
		}

		if (targetHeadingLine < 0) {
			return lines.length;
		}

		// 次の見出しがあればその直前、なければファイル末尾
		return nextHeadingLine >= 0 ? nextHeadingLine : lines.length;
	}

	/**
	 * 指定行時点でのパスを構築
	 */
	private static buildPathAtLine(lines: string[], lineIndex: number): Path | null {
		const headingStack: { level: number; text: string }[] = [];

		for (let i = 0; i <= lineIndex; i++) {
			const line = lines[i];
			const match = line.match(/^(#{1,6})\s+(.+)$/);

			if (match) {
				const level = match[1].length;
				const text = match[2].trim();

				// 現在のレベル以上の見出しを削除
				while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
					headingStack.pop();
				}

				headingStack.push({ level, text });
			}
		}

		return Path.create(headingStack.map((h) => h.text));
	}
}
