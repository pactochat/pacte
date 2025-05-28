import { Schema as S } from 'effect'

import {
	DocumentId,
	FileId,
	FolderId,
	OrganizationId,
	UserId,
	WorkspaceId,
} from './types'

/**
 * Base event class
 */
export const BaseEvent = S.Struct({
	eventId: S.String,
	timestamp: S.Date,
	userId: UserId,
})

/**
 * Event emitted when a workspace is created
 */
export class WorkspaceCreated extends S.Class<WorkspaceCreated>(
	'@aipacto/workspace-domain/WorkspaceCreated',
)({
	...BaseEvent.fields,
	workspaceId: WorkspaceId,
	organizationId: OrganizationId,
	name: S.String,
	type: S.String,
}) {}

/**
 * Event emitted when a folder is created
 */
export class FolderCreated extends S.Class<FolderCreated>(
	'@aipacto/workspace-domain/FolderCreated',
)({
	...BaseEvent.fields,
	folderId: FolderId,
	workspaceId: WorkspaceId,
	parentId: S.NullOr(FolderId),
	name: S.String,
}) {}

/**
 * Event emitted when a document is created
 */
export class DocumentCreated extends S.Class<DocumentCreated>(
	'@aipacto/workspace-domain/DocumentCreated',
)({
	...BaseEvent.fields,
	documentId: DocumentId,
	workspaceId: WorkspaceId,
	folderId: FolderId,
	name: S.String,
	format: S.String,
}) {}

/**
 * Event emitted when a file is uploaded
 */
export class FileUploaded extends S.Class<FileUploaded>(
	'@aipacto/workspace-domain/FileUploaded',
)({
	...BaseEvent.fields,
	fileId: FileId,
	workspaceId: WorkspaceId,
	folderId: FolderId,
	name: S.String,
	size: S.Number,
	mimeType: S.String,
}) {}

/**
 * Event emitted when a document is locked
 */
export class DocumentLocked extends S.Class<DocumentLocked>(
	'@aipacto/workspace-domain/DocumentLocked',
)({
	...BaseEvent.fields,
	documentId: DocumentId,
	lockedBy: UserId,
	expiresAt: S.Date,
}) {}

/**
 * Event emitted when a document is unlocked
 */
export class DocumentUnlocked extends S.Class<DocumentUnlocked>(
	'@aipacto/workspace-domain/DocumentUnlocked',
)({
	...BaseEvent.fields,
	documentId: DocumentId,
	unlockedBy: UserId,
}) {}

/**
 * Event emitted when a resource is moved
 */
export class ResourceMoved extends S.Class<ResourceMoved>(
	'@aipacto/workspace-domain/ResourceMoved',
)({
	...BaseEvent.fields,
	resourceType: S.String,
	resourceId: S.String,
	fromParentId: S.NullOr(S.String),
	toParentId: S.NullOr(S.String),
}) {}
