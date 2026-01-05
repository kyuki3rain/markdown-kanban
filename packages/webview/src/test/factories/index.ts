import type { KanbanConfig, TaskDto, TaskMetadata } from '../../types';

/**
 * Create a mock TaskDto with default values
 */
export function createMockTask(overrides: Partial<TaskDto> = {}): TaskDto {
	return {
		id: 'task-1',
		title: 'Test Task',
		status: 'todo',
		path: [],
		isChecked: false,
		metadata: {},
		...overrides,
	};
}

/**
 * Create multiple mock tasks
 */
export function createMockTasks(
	count: number,
	statusDistribution?: Record<string, number>,
): TaskDto[] {
	const tasks: TaskDto[] = [];
	let taskIndex = 0;

	if (statusDistribution) {
		for (const [status, num] of Object.entries(statusDistribution)) {
			for (let i = 0; i < num; i++) {
				tasks.push(
					createMockTask({
						id: `task-${++taskIndex}`,
						title: `Task ${taskIndex}`,
						status,
					}),
				);
			}
		}
	} else {
		for (let i = 0; i < count; i++) {
			tasks.push(
				createMockTask({
					id: `task-${i + 1}`,
					title: `Task ${i + 1}`,
				}),
			);
		}
	}

	return tasks;
}

/**
 * Create a mock KanbanConfig with default values
 */
export function createMockConfig(overrides: Partial<KanbanConfig> = {}): KanbanConfig {
	return {
		statuses: ['todo', 'in-progress', 'done'],
		doneStatuses: ['done'],
		defaultStatus: 'todo',
		defaultDoneStatus: 'done',
		sortBy: 'markdown',
		syncCheckboxWithDone: true,
		...overrides,
	};
}

/**
 * Create mock TaskMetadata
 */
export function createMockMetadata(overrides: Partial<TaskMetadata> = {}): TaskMetadata {
	return {
		priority: undefined,
		due: undefined,
		assignee: undefined,
		tags: undefined,
		...overrides,
	};
}
