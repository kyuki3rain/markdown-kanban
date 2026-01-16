import { err, ok, type Result } from 'neverthrow';
import type { TaskMetadata } from '../../domain/entities/task';
import { Path } from '../../domain/valueObjects/path';
import type { Status } from '../../domain/valueObjects/status';
import { detectEol, joinLines, splitLines } from '../../shared/eol';
import type { MarkdownParser, ParsedTask } from './markdownParser';
import { TaskLineEditor } from './taskLineEditor';

/**
 * タスク作成情報
 */
export interface CreateTaskInfo {
	title: string;
	path: Path;
	status: Status;
	metadata?: TaskMetadata;
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
	/** 新しいパス（見出し階層） */
	newPath?: Path;
	/** 新しいメタデータ */
	newMetadata?: TaskMetadata;
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
 * MarkdownSerializer
 * タスクの作成・更新・削除・移動をMarkdownに反映する責務を担当
 */
export class MarkdownSerializer {
	private readonly lineEditor: TaskLineEditor;

	constructor(private readonly parser: MarkdownParser) {
		this.lineEditor = new TaskLineEditor();
	}

	/**
	 * 編集を適用する
	 */
	applyEdit(markdown: string, edit: TaskEdit): Result<string, SerializerError> {
		// 新規作成の場合
		if (edit.create) {
			return this.createTask(markdown, edit.create, edit.doneStatuses);
		}

		// 更新/削除の場合
		if (!edit.taskId) {
			return err(new SerializerError('タスクIDが指定されていません'));
		}

		// Markdownをパース
		const parseResult = this.parser.parse(markdown);
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
			return this.deleteTask(markdown, task);
		}

		// 更新の場合
		return this.updateTask(markdown, task, edit);
	}

	/**
	 * タスクを更新する（その場で更新）
	 */
	private updateTask(
		markdown: string,
		task: ParsedTask,
		edit: TaskEdit,
	): Result<string, SerializerError> {
		// パス変更がある場合は移動処理に委譲
		if (edit.newPath && !edit.newPath.equals(task.path)) {
			return this.moveTask(markdown, task, edit);
		}

		const eolInfo = detectEol(markdown);
		const lines = splitLines(markdown);

		// タスク行を取得して変更を適用
		const taskLines = lines.slice(task.startLine - 1, task.endLine);
		this.lineEditor.applyTitleChange(taskLines, edit.newTitle);
		this.lineEditor.applyStatusChange(taskLines, edit.newStatus, edit.doneStatuses);
		this.lineEditor.applyMetadataChange(taskLines, edit.newMetadata, task.metadata);

		// 変更後の行で元の行を置き換え
		lines.splice(task.startLine - 1, task.endLine - task.startLine + 1, ...taskLines);

		return ok(joinLines(lines, eolInfo));
	}

	/**
	 * タスクを別のパスに移動する
	 */
	private moveTask(
		markdown: string,
		task: ParsedTask,
		edit: TaskEdit,
	): Result<string, SerializerError> {
		const newPath = edit.newPath;
		if (!newPath) {
			return err(new SerializerError('移動先パスが指定されていません'));
		}

		// 移動先パスの検証
		const validationResult = this.validateTargetPath(markdown, newPath);
		if (validationResult.isErr()) {
			return err(validationResult.error);
		}

		const eolInfo = detectEol(markdown);

		// タスクの元のテキストを取得（メタデータを含む全行）
		const lines = splitLines(markdown);
		const taskLines = lines.slice(task.startLine - 1, task.endLine);

		// タスク行に変更を適用
		this.lineEditor.applyTitleChange(taskLines, edit.newTitle);
		this.lineEditor.applyStatusChange(taskLines, edit.newStatus, edit.doneStatuses);
		this.lineEditor.applyMetadataChange(taskLines, edit.newMetadata, task.metadata);

		// 元の場所からタスクを削除
		const deleteCount = task.endLine - task.startLine + 1;
		lines.splice(task.startLine - 1, deleteCount);

		// 削除後のMarkdownを再パースして挿入位置を決定
		const deletedMarkdown = joinLines(lines, eolInfo);
		const insertLineResult = this.findInsertLineForNewPath(deletedMarkdown, newPath);
		if (insertLineResult.isErr()) {
			return err(insertLineResult.error);
		}

		// 新しい場所にタスクを挿入
		const remainingLines = splitLines(deletedMarkdown);
		remainingLines.splice(insertLineResult.value, 0, ...taskLines);

		return ok(joinLines(remainingLines, eolInfo));
	}

	/**
	 * タスクを削除する
	 */
	private deleteTask(markdown: string, task: ParsedTask): Result<string, SerializerError> {
		const eolInfo = detectEol(markdown);
		const lines = splitLines(markdown);

		// タスク行と子要素を削除
		const deleteCount = task.endLine - task.startLine + 1;
		lines.splice(task.startLine - 1, deleteCount);

		return ok(joinLines(lines, eolInfo));
	}

	/**
	 * タスクを作成する
	 */
	private createTask(
		markdown: string,
		create: CreateTaskInfo,
		doneStatuses?: string[],
	): Result<string, SerializerError> {
		const parseResult = this.parser.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const eolInfo = detectEol(markdown);
		const { tasks, headings } = parseResult.value;
		const lines = splitLines(markdown);

		// チェックボックスの状態を決定
		const isDone = doneStatuses?.includes(create.status.value) ?? false;
		const checkbox = isDone ? '[x]' : '[ ]';

		// タスク行を生成
		const taskLines = [`- ${checkbox} ${create.title}`, `  - status: ${create.status.value}`];

		// メタデータを追加（status以外）
		if (create.metadata) {
			for (const [key, value] of Object.entries(create.metadata)) {
				if (key !== 'status' && value !== undefined && value !== null && value !== '') {
					taskLines.push(`  - ${key}: ${value}`);
				}
			}
		}

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
				const firstHeadingLine = this.findFirstHeadingLine(lines);
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
				insertLine = this.findInsertLineForPath(lines, create.path, headings);
			}
		}

		// 行を挿入
		lines.splice(insertLine, 0, ...taskLines);

		return ok(joinLines(lines, eolInfo));
	}

	/**
	 * 移動先パスが有効か検証する
	 */
	private validateTargetPath(markdown: string, targetPath: Path): Result<void, SerializerError> {
		if (targetPath.isRoot()) {
			return ok(undefined);
		}

		const parseResult = this.parser.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { headings } = parseResult.value;
		const headingExists = headings.some((h) => h.equals(targetPath));
		if (!headingExists) {
			return err(new SerializerError(`見出しが見つかりません: ${targetPath.toString()}`));
		}

		return ok(undefined);
	}

	/**
	 * 新しいパスへの挿入位置を決定する
	 */
	private findInsertLineForNewPath(
		markdown: string,
		targetPath: Path,
	): Result<number, SerializerError> {
		const parseResult = this.parser.parse(markdown);
		if (parseResult.isErr()) {
			return err(new SerializerError('Markdownのパースに失敗しました'));
		}

		const { tasks, headings } = parseResult.value;
		const lines = splitLines(markdown);

		if (targetPath.isRoot()) {
			return ok(this.findInsertLineForRoot(lines, tasks));
		}

		return ok(this.findInsertLineForHeading(lines, tasks, headings, targetPath));
	}

	/**
	 * ルートへの挿入位置を決定する
	 */
	private findInsertLineForRoot(lines: string[], tasks: ParsedTask[]): number {
		const rootTasks = tasks.filter((t) => t.path.isRoot());
		if (rootTasks.length > 0) {
			return rootTasks[rootTasks.length - 1].endLine;
		}

		const firstHeadingLine = this.findFirstHeadingLine(lines);
		return firstHeadingLine >= 0 ? firstHeadingLine : lines.length;
	}

	/**
	 * 見出し配下への挿入位置を決定する
	 */
	private findInsertLineForHeading(
		lines: string[],
		tasks: ParsedTask[],
		headings: Path[],
		targetPath: Path,
	): number {
		const pathTasks = tasks.filter((t) => t.path.equals(targetPath));
		if (pathTasks.length > 0) {
			return pathTasks[pathTasks.length - 1].endLine;
		}

		return this.findInsertLineForPath(lines, targetPath, headings);
	}

	/**
	 * 最初の見出し行を見つける
	 */
	private findFirstHeadingLine(lines: string[]): number {
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
	private findInsertLineForPath(lines: string[], targetPath: Path, _headings: Path[]): number {
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
						const currentPath = this.buildPathAtLine(lines, i);
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
	private buildPathAtLine(lines: string[], lineIndex: number): Path | null {
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
