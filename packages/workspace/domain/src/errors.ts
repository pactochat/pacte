import { Data } from 'effect'

/**
 * Base error for workspace operations
 */
export class WorkspaceError extends Data.TaggedError('WorkspaceError')<{
	message: string
	cause?: unknown
}> {}

/**
 * Error when a workspace is not found
 */
export class WorkspaceNotFound extends Data.TaggedError('WorkspaceNotFound')<{
	workspaceId: string
}> {}

/**
 * Error when a folder is not found
 */
export class FolderNotFound extends Data.TaggedError('FolderNotFound')<{
	folderId: string
}> {}

/**
 * Error when a document is not found
 */
export class DocumentNotFound extends Data.TaggedError('DocumentNotFound')<{
	documentId: string
}> {}

/**
 * Error when a file is not found
 */
export class FileNotFound extends Data.TaggedError('FileNotFound')<{
	fileId: string
}> {}

/**
 * Error when a document is locked by another user
 */
export class DocumentLocked extends Data.TaggedError('DocumentLocked')<{
	documentId: string
	lockedBy: string
}> {}

/**
 * Error when storage operation fails
 */
export class StorageError extends Data.TaggedError('StorageError')<{
	operation: string
	message: string
	cause?: unknown
}> {}

/**
 * Error when a resource name conflicts with existing
 */
export class NameConflictError extends Data.TaggedError('NameConflictError')<{
	name: string
	parentId: string
	resourceType: string
}> {}

/**
 * Error when quota is exceeded
 */
export class QuotaExceededError extends Data.TaggedError('QuotaExceededError')<{
	quotaType: string
	limit: number
	current: number
}> {}
