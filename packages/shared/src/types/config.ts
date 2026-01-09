/**
 * ソート順の型
 */
export type SortBy = 'markdown' | 'priority' | 'due' | 'alphabetical';

/**
 * カンバン設定
 */
export interface KanbanConfig {
	/**
	 * ステータス一覧（カラムの表示順）
	 */
	statuses: string[];

	/**
	 * 完了扱いとするステータス
	 */
	doneStatuses: string[];

	/**
	 * デフォルトステータス（[ ] の時、status未指定時に使用）
	 */
	defaultStatus: string;

	/**
	 * デフォルト完了ステータス（[x] の時、status未指定時に使用）
	 */
	defaultDoneStatus: string;

	/**
	 * ソート順
	 */
	sortBy: SortBy;

	/**
	 * Done時にチェックボックスも連動させるか
	 */
	syncCheckboxWithDone: boolean;

	/**
	 * フィルタリング対象パス（空配列の場合は全タスク表示）
	 */
	filterPaths: string[];
}

/**
 * デフォルト設定値
 */
export const DEFAULT_CONFIG: KanbanConfig = {
	statuses: ['todo', 'in-progress', 'done'],
	doneStatuses: ['done'],
	defaultStatus: 'todo',
	defaultDoneStatus: 'done',
	sortBy: 'markdown',
	syncCheckboxWithDone: true,
	filterPaths: [],
};
