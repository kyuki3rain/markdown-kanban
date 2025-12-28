import type { Task } from '../../domain/entities/task';
import type { KanbanConfig } from '../../domain/ports/configProvider';

/**
 * 優先度の順序マップ
 * 数値が小さいほど優先度が高い
 */
const PRIORITY_ORDER: Record<string, number> = {
	high: 0,
	medium: 1,
	low: 2,
};

/**
 * 未定義または未知の優先度に対するデフォルト順序
 */
const DEFAULT_PRIORITY_ORDER = 999;

/**
 * タスクを指定されたソートモードでソートする
 * @param tasks ソート対象のタスク配列
 * @param sortBy ソートモード
 * @returns ソート済みのタスク配列（元の配列は変更されない）
 */
export function sortTasks(tasks: Task[], sortBy: KanbanConfig['sortBy']): Task[] {
	if (sortBy === 'markdown') {
		return tasks;
	}

	const sorted = [...tasks];

	switch (sortBy) {
		case 'alphabetical':
			return sorted.sort((a, b) => a.title.localeCompare(b.title));

		case 'priority':
			return sorted.sort((a, b) => {
				const orderA = PRIORITY_ORDER[a.metadata.priority ?? ''] ?? DEFAULT_PRIORITY_ORDER;
				const orderB = PRIORITY_ORDER[b.metadata.priority ?? ''] ?? DEFAULT_PRIORITY_ORDER;
				return orderA - orderB;
			});

		case 'due':
			return sorted.sort((a, b) => {
				const dueA = a.metadata.due;
				const dueB = b.metadata.due;
				if (!dueA && !dueB) return 0;
				if (!dueA) return 1;
				if (!dueB) return -1;
				return dueA.localeCompare(dueB);
			});

		default:
			return tasks;
	}
}
