// Infrastructure Clients

// Separated classes for fine-grained testing
export { MarkdownParser } from './markdownParser';
export { MarkdownSerializer } from './markdownSerializer';
export {
	type CreateTaskInfo,
	type FrontmatterConfig,
	MarkdownParseError,
	MarkdownTaskClient,
	type ParsedTask,
	type ParseResult,
	SerializerError,
	type TaskEdit,
} from './markdownTaskClient';
export { type FrontmatterResult, RemarkClient } from './remarkClient';
export { TaskLineEditor } from './taskLineEditor';
export { VscodeConfigClient, type VscodeConfigDeps } from './vscodeConfigClient';
export {
	DocumentEditError,
	type DocumentInfo,
	DocumentNotFoundError,
	NoActiveEditorError,
	VscodeDocumentClient,
	type VscodeDocumentDeps,
} from './vscodeDocumentClient';
