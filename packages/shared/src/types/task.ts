/**
 * タスクメタデータ
 * キーと値の両方が文字列のシンプルな辞書型
 */
export type TaskMetadata = Record<string, string>;

/**
 * タスクDTO（Extension ⇔ WebView間の通信用）
 */
export interface TaskDto {
	id: string;
	title: string;
	status: string;
	path: string[];
	isChecked: boolean;
	metadata: TaskMetadata;
}
