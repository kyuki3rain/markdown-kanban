/**
 * メッセージ型定義
 * @md-tasks/sharedから再エクスポート
 */
export type {
	ChangeTaskStatusRequest,
	ConfigUpdatedMessage,
	CreateTaskRequest,
	DeleteTaskRequest,
	DocumentStateChangedMessage,
	ErrorMessage,
	ExtensionToWebViewMessage,
	GetConfigRequest,
	GetLockStateRequest,
	// WebView → Extension
	GetTasksRequest,
	KanbanConfig,
	LockStateChangedMessage,
	// Combined
	Message,
	MessageType,
	RevertDocumentRequest,
	SaveDocumentRequest,
	SortBy,
	TaskDto,
	TaskMetadata,
	// Extension → WebView
	TasksUpdatedMessage,
	ToggleLockRequest,
	UpdateConfigRequest,
	UpdateTaskRequest,
	WebViewToExtensionMessage,
} from '@md-tasks/shared';
