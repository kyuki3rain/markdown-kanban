export type { KanbanConfig, SortBy } from './config';
export { DEFAULT_CONFIG } from './config';
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
	LockStateChangedMessage,
	// Combined
	Message,
	MessageType,
	RevertDocumentRequest,
	SaveDocumentRequest,
	// Extension → WebView
	TasksUpdatedMessage,
	ToggleLockRequest,
	UpdateConfigRequest,
	UpdateTaskRequest,
	WebViewToExtensionMessage,
} from './messages';
export type { TaskDto, TaskMetadata } from './task';
