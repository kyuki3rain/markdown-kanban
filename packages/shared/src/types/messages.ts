import type { KanbanConfig, SortBy } from './config';
import type { TaskDto, TaskMetadata } from './task';

// =============================================================================
// WebView → Extension メッセージ
// =============================================================================

/**
 * タスク一覧取得リクエスト
 */
export interface GetTasksRequest {
	type: 'GET_TASKS';
}

/**
 * タスク作成リクエスト
 */
export interface CreateTaskRequest {
	type: 'CREATE_TASK';
	payload: {
		title: string;
		path: string[];
		status?: string;
		metadata?: TaskMetadata;
	};
}

/**
 * タスク更新リクエスト
 */
export interface UpdateTaskRequest {
	type: 'UPDATE_TASK';
	payload: {
		id: string;
		title?: string;
		path?: string[];
		status?: string;
		metadata?: TaskMetadata;
	};
}

/**
 * タスク削除リクエスト
 */
export interface DeleteTaskRequest {
	type: 'DELETE_TASK';
	payload: {
		id: string;
	};
}

/**
 * タスクステータス変更リクエスト
 */
export interface ChangeTaskStatusRequest {
	type: 'CHANGE_TASK_STATUS';
	payload: {
		id: string;
		status: string;
	};
}

/**
 * 設定取得リクエスト
 */
export interface GetConfigRequest {
	type: 'GET_CONFIG';
}

/**
 * ドキュメント保存リクエスト
 */
export interface SaveDocumentRequest {
	type: 'SAVE_DOCUMENT';
}

/**
 * ドキュメント破棄リクエスト
 */
export interface RevertDocumentRequest {
	type: 'REVERT_DOCUMENT';
}

/**
 * 設定更新リクエスト
 */
export interface UpdateConfigRequest {
	type: 'UPDATE_CONFIG';
	payload: {
		filterPaths?: string[];
		sortBy?: SortBy;
	};
}

/**
 * ロック状態取得リクエスト
 */
export interface GetLockStateRequest {
	type: 'GET_LOCK_STATE';
}

/**
 * ロック状態トグルリクエスト
 */
export interface ToggleLockRequest {
	type: 'TOGGLE_LOCK';
}

/**
 * WebView → Extension の全メッセージタイプ
 */
export type WebViewToExtensionMessage =
	| GetTasksRequest
	| CreateTaskRequest
	| UpdateTaskRequest
	| DeleteTaskRequest
	| ChangeTaskStatusRequest
	| GetConfigRequest
	| SaveDocumentRequest
	| RevertDocumentRequest
	| UpdateConfigRequest
	| GetLockStateRequest
	| ToggleLockRequest;

// =============================================================================
// Extension → WebView メッセージ
// =============================================================================

/**
 * タスク一覧更新メッセージ
 */
export interface TasksUpdatedMessage {
	type: 'TASKS_UPDATED';
	payload: {
		tasks: TaskDto[];
	};
}

/**
 * 設定更新メッセージ
 */
export interface ConfigUpdatedMessage {
	type: 'CONFIG_UPDATED';
	payload: {
		config: KanbanConfig;
	};
}

/**
 * エラーメッセージ
 */
export interface ErrorMessage {
	type: 'ERROR';
	payload: {
		message: string;
		code?: string;
	};
}

/**
 * ドキュメント状態変更メッセージ
 */
export interface DocumentStateChangedMessage {
	type: 'DOCUMENT_STATE_CHANGED';
	payload: {
		isDirty: boolean;
	};
}

/**
 * ロック状態変更メッセージ
 */
export interface LockStateChangedMessage {
	type: 'LOCK_STATE_CHANGED';
	payload: {
		isLocked: boolean;
	};
}

/**
 * Extension → WebView の全メッセージタイプ
 */
export type ExtensionToWebViewMessage =
	| TasksUpdatedMessage
	| ConfigUpdatedMessage
	| ErrorMessage
	| DocumentStateChangedMessage
	| LockStateChangedMessage;

/**
 * 全メッセージタイプ
 */
export type Message = WebViewToExtensionMessage | ExtensionToWebViewMessage;

/**
 * メッセージタイプの文字列リテラル
 */
export type MessageType = Message['type'];
