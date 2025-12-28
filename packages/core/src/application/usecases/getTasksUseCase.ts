import { ok, type Result } from 'neverthrow';
import type { Task } from '../../domain/entities/task';
import type { DocumentOperationError } from '../../domain/errors/documentOperationError';
import type { NoActiveEditorError } from '../../domain/errors/noActiveEditorError';
import type { TaskParseError } from '../../domain/errors/taskParseError';
import type { ConfigProvider } from '../../domain/ports/configProvider';
import type { TaskRepository } from '../../domain/ports/taskRepository';
import type { Path } from '../../domain/valueObjects/path';
import { sortTasks } from '../services/taskSorter';

/**
 * タスク一覧取得ユースケース
 */
export class GetTasksUseCase {
	constructor(
		private readonly taskRepository: TaskRepository,
		private readonly configProvider: ConfigProvider,
	) {}

	/**
	 * 全タスクを取得する
	 */
	async execute(): Promise<
		Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>
	> {
		const tasksResult = await this.taskRepository.findAll();
		if (tasksResult.isErr()) {
			return tasksResult;
		}

		const config = await this.configProvider.getConfig();
		const sortedTasks = sortTasks(tasksResult.value, config.sortBy);
		return ok(sortedTasks);
	}

	/**
	 * 指定したパス配下のタスクを取得する
	 */
	async executeByPath(
		path: Path,
	): Promise<Result<Task[], TaskParseError | NoActiveEditorError | DocumentOperationError>> {
		const tasksResult = await this.taskRepository.findByPath(path);
		if (tasksResult.isErr()) {
			return tasksResult;
		}

		const config = await this.configProvider.getConfig();
		const sortedTasks = sortTasks(tasksResult.value, config.sortBy);
		return ok(sortedTasks);
	}
}
