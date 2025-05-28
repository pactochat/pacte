import { Context, type Effect } from 'effect'

import type {
	EntityDocument,
	EntityFile,
	EntityFolder,
	EntityGroup,
	EntityOrganization,
	EntityWorkspace,
} from '@aipacto/workspace-domain'
import type {
	DocumentId,
	FileId,
	FolderContentsOutput,
	FolderId,
	GroupId,
	OrganizationId,
	UserId,
	WorkspaceId,
} from '@aipacto/workspace-domain'

/**
 * Repository for workspace operations
 */
export interface WorkspaceRepository {
	// Workspace operations
	createWorkspace: (
		workspace: EntityWorkspace,
	) => Effect.Effect<EntityWorkspace>
	getWorkspace: (id: WorkspaceId) => Effect.Effect<EntityWorkspace>
	updateWorkspace: (
		workspace: EntityWorkspace,
	) => Effect.Effect<EntityWorkspace>
	deleteWorkspace: (id: WorkspaceId) => Effect.Effect<void>
	listWorkspaces: (
		organizationId: OrganizationId,
	) => Effect.Effect<readonly EntityWorkspace[]>

	// Folder operations
	createFolder: (folder: EntityFolder) => Effect.Effect<EntityFolder>
	getFolder: (id: FolderId) => Effect.Effect<EntityFolder>
	updateFolder: (folder: EntityFolder) => Effect.Effect<EntityFolder>
	deleteFolder: (id: FolderId) => Effect.Effect<void>
	getFolderContents: (id: FolderId) => Effect.Effect<FolderContentsOutput>
	moveFolder: (
		id: FolderId,
		newParentId: FolderId | null,
	) => Effect.Effect<EntityFolder>

	// Document operations
	createDocument: (document: EntityDocument) => Effect.Effect<EntityDocument>
	getDocument: (id: DocumentId) => Effect.Effect<EntityDocument>
	updateDocument: (document: EntityDocument) => Effect.Effect<EntityDocument>
	deleteDocument: (id: DocumentId) => Effect.Effect<void>
	lockDocument: (
		id: DocumentId,
		userId: UserId,
	) => Effect.Effect<EntityDocument>
	unlockDocument: (
		id: DocumentId,
		userId: UserId,
	) => Effect.Effect<EntityDocument>

	// File operations
	createFile: (file: EntityFile) => Effect.Effect<EntityFile>
	getFile: (id: FileId) => Effect.Effect<EntityFile>
	updateFile: (file: EntityFile) => Effect.Effect<EntityFile>
	deleteFile: (id: FileId) => Effect.Effect<void>
}

export const WorkspaceRepository = Context.GenericTag<WorkspaceRepository>(
	'WorkspaceRepository',
)

/**
 * Repository for organization operations
 */
export interface OrganizationRepository {
	create: (
		organization: EntityOrganization,
	) => Effect.Effect<EntityOrganization>
	get: (id: OrganizationId) => Effect.Effect<EntityOrganization>
	update: (
		organization: EntityOrganization,
	) => Effect.Effect<EntityOrganization>
	delete: (id: OrganizationId) => Effect.Effect<void>
	list: () => Effect.Effect<readonly EntityOrganization[]>
}

export const OrganizationRepository =
	Context.GenericTag<OrganizationRepository>('OrganizationRepository')

/**
 * Repository for group operations
 */
export interface GroupRepository {
	create: (group: EntityGroup) => Effect.Effect<EntityGroup>
	get: (id: GroupId) => Effect.Effect<EntityGroup>
	update: (group: EntityGroup) => Effect.Effect<EntityGroup>
	delete: (id: GroupId) => Effect.Effect<void>
	listByOrganization: (
		organizationId: OrganizationId,
	) => Effect.Effect<readonly EntityGroup[]>
	listByUser: (userId: UserId) => Effect.Effect<readonly EntityGroup[]>
}

export const GroupRepository =
	Context.GenericTag<GroupRepository>('GroupRepository')

/**
 * Service for document content operations
 */
export interface DocumentContentService {
	/**
	 * Initialize new document content
	 */
	initializeContent: (
		documentId: DocumentId,
		format: string,
	) => Effect.Effect<string>

	/**
	 * Load document content
	 */
	loadContent: (documentId: DocumentId) => Effect.Effect<string>

	/**
	 * Save document content
	 */
	saveContent: (documentId: DocumentId, content: string) => Effect.Effect<void>

	/**
	 * Apply collaborative changes
	 */
	applyChanges: (
		documentId: DocumentId,
		changes: Uint8Array,
	) => Effect.Effect<string>

	/**
	 * Get document changes since version
	 */
	getChanges: (
		documentId: DocumentId,
		sinceVersion: number,
	) => Effect.Effect<Uint8Array>
}

export const DocumentContentService =
	Context.GenericTag<DocumentContentService>('DocumentContentService')

/**
 * Service for file storage operations
 */
export interface FileStorageService {
	/**
	 * Upload file to storage
	 */
	upload: (params: {
		fileId: FileId
		content: ArrayBuffer | ReadableStream
		mimeType: string
	}) => Effect.Effect<{ storageKey: string; size: number }>

	/**
	 * Get download URL for file
	 */
	getDownloadUrl: (storageKey: string) => Effect.Effect<string>

	/**
	 * Get upload URL for direct upload
	 */
	getUploadUrl: (params: {
		fileId: FileId
		mimeType: string
	}) => Effect.Effect<{ url: string; storageKey: string }>

	/**
	 * Delete file from storage
	 */
	delete: (storageKey: string) => Effect.Effect<void>
}

export const FileStorageService =
	Context.GenericTag<FileStorageService>('FileStorageService')
