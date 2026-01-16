import type { TaskMetadata } from '../../domain/entities/task';
import type { Status } from '../../domain/valueObjects/status';

/**
 * TaskLineEditor
 * タスク行の編集（タイトル・ステータス・メタデータの変更）を担当
 */
export class TaskLineEditor {
	/**
	 * タスク行にタイトル変更を適用する
	 */
	applyTitleChange(taskLines: string[], newTitle?: string): void {
		if (!newTitle) return;

		const checkboxPattern = /^(\s*-\s*\[[ xX]\]\s*)(.+)$/;
		const match = taskLines[0].match(checkboxPattern);
		if (match) {
			taskLines[0] = match[1] + newTitle;
		}
	}

	/**
	 * タスク行にステータス変更を適用する
	 */
	applyStatusChange(taskLines: string[], newStatus?: Status, doneStatuses?: string[]): void {
		if (!newStatus) return;

		const isDone = doneStatuses?.includes(newStatus.value) ?? false;

		// チェックボックスを更新
		if (isDone) {
			taskLines[0] = taskLines[0].replace(/\[[ ]\]/, '[x]');
		} else {
			taskLines[0] = taskLines[0].replace(/\[[xX]\]/, '[ ]');
		}

		// ステータス行を更新または追加
		const statusLineIndex = this.findStatusLineIndex(taskLines);

		if (statusLineIndex >= 0) {
			const indent = taskLines[statusLineIndex].match(/^(\s*)/)?.[1] ?? '  ';
			taskLines[statusLineIndex] = `${indent}- status: ${newStatus.value}`;
		} else {
			taskLines.splice(1, 0, `  - status: ${newStatus.value}`);
		}
	}

	/**
	 * タスク行にメタデータ変更を適用する
	 * status は applyStatusChange で処理するため除外
	 */
	applyMetadataChange(
		taskLines: string[],
		newMetadata?: TaskMetadata,
		oldMetadata?: TaskMetadata,
	): void {
		if (!newMetadata) return;

		// status 以外のメタデータキーを処理
		const metadataKeys = Object.keys(newMetadata).filter((key) => key !== 'status');
		const oldMetadataKeys = oldMetadata
			? Object.keys(oldMetadata).filter((key) => key !== 'status')
			: [];

		// 削除されたキーを特定
		const deletedKeys = oldMetadataKeys.filter((key) => !(key in newMetadata));

		// 削除されたキーの行を削除
		for (const key of deletedKeys) {
			const index = this.findMetadataLineIndex(taskLines, key);
			if (index >= 0) {
				taskLines.splice(index, 1);
			}
		}

		// 新しい/更新されたメタデータを処理
		for (const key of metadataKeys) {
			const value = newMetadata[key];
			if (value === undefined || value === null || value === '') {
				// 空の値の場合は削除
				const index = this.findMetadataLineIndex(taskLines, key);
				if (index >= 0) {
					taskLines.splice(index, 1);
				}
			} else {
				// 値がある場合は更新または追加
				const index = this.findMetadataLineIndex(taskLines, key);
				const indent = taskLines.length > 1 ? (taskLines[1].match(/^(\s*)/)?.[1] ?? '  ') : '  ';

				if (index >= 0) {
					taskLines[index] = `${indent}- ${key}: ${value}`;
				} else {
					// 新しいメタデータを追加（statusの後、または最初の子リスト項目として）
					const statusIndex = this.findStatusLineIndex(taskLines);
					const insertIndex = statusIndex >= 0 ? statusIndex + 1 : 1;
					taskLines.splice(insertIndex, 0, `${indent}- ${key}: ${value}`);
				}
			}
		}
	}

	/**
	 * タスク行内のステータス行のインデックスを見つける
	 */
	findStatusLineIndex(taskLines: string[]): number {
		for (let i = 1; i < taskLines.length; i++) {
			if (taskLines[i].match(/^\s*-\s*status:\s*.+$/)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * タスク行内の特定のメタデータ行のインデックスを見つける
	 */
	findMetadataLineIndex(taskLines: string[], key: string): number {
		const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const pattern = new RegExp(`^\\s*-\\s*${escapeRegex(key)}:\\s*.+$`);
		for (let i = 1; i < taskLines.length; i++) {
			if (taskLines[i].match(pattern)) {
				return i;
			}
		}
		return -1;
	}
}
