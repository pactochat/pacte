import { Schema as S } from 'effect'

import {
	DocumentFormat,
	EntityDocument,
	EntityFile,
	EntityFolder,
} from './entities'

export const OrganizationId = S.String.pipe(
	S.brand('OrganizationId'),
	S.pattern(/^org_[a-zA-Z0-9]{8,}$/),
)
export type OrganizationId = typeof OrganizationId.Type

export const WorkspaceId = S.String.pipe(
	S.brand('WorkspaceId'),
	S.pattern(/^ws_[a-zA-Z0-9]{8,}$/),
)
export type WorkspaceId = typeof WorkspaceId.Type

export const FolderId = S.String.pipe(
	S.brand('FolderId'),
	S.pattern(/^fold_[a-zA-Z0-9]{8,}$/),
)
export type FolderId = typeof FolderId.Type

export const DocumentId = S.String.pipe(
	S.brand('DocumentId'),
	S.pattern(/^doc_[a-zA-Z0-9]{8,}$/),
)
export type DocumentId = typeof DocumentId.Type

export const FileId = S.String.pipe(
	S.brand('FileId'),
	S.pattern(/^file_[a-zA-Z0-9]{8,}$/),
)
export type FileId = typeof FileId.Type

export const UserId = S.String.pipe(
	S.brand('UserId'),
	S.pattern(/^user_[a-zA-Z0-9]{8,}$/),
)
export type UserId = typeof UserId.Type

export const GroupId = S.String.pipe(
	S.brand('GroupId'),
	S.pattern(/^grp_[a-zA-Z0-9]{8,}$/),
)
export type GroupId = typeof GroupId.Type

/**
 * Input for creating a workspace
 */
export const CreateWorkspaceInput = S.Struct({
	/**
	 * Organization to create workspace in
	 */
	organizationId: OrganizationId,
	/**
	 * Name of the workspace
	 */
	name: S.String,
	/**
	 * Owner of the workspace
	 */
	ownerId: UserId,
}).annotations({ identifier: '@aipacto/workspace-domain/CreateWorkspaceInput' })
export type CreateWorkspaceInput = typeof CreateWorkspaceInput.Type

/**
 * Input for creating a folder
 */
export const CreateFolderInput = S.Struct({
	/**
	 * Workspace to create folder in
	 */
	workspaceId: WorkspaceId,
	/**
	 * Parent folder ID (null for root level)
	 */
	parentId: S.NullOr(FolderId),
	/**
	 * Name of the folder
	 */
	name: S.String,
	/**
	 * Owner of the folder
	 */
	ownerId: UserId,
}).annotations({ identifier: '@aipacto/workspace-domain/CreateFolderInput' })
export type CreateFolderInput = typeof CreateFolderInput.Type

/**
 * Input for creating a document
 */
export const CreateDocumentInput = S.Struct({
	/**
	 * Workspace the document belongs to
	 */
	workspaceId: WorkspaceId,
	/**
	 * Folder to create document in
	 */
	folderId: FolderId,
	/**
	 * Name of the document
	 */
	name: S.String,
	/**
	 * Document format
	 */
	format: S.optional(DocumentFormat),
	/**
	 * Owner of the document
	 */
	ownerId: UserId,
}).annotations({ identifier: '@aipacto/workspace-domain/CreateDocumentInput' })
export type CreateDocumentInput = typeof CreateDocumentInput.Type

/**
 * Input for creating a file
 */
export const CreateFileInput = S.Struct({
	/**
	 * Workspace the file belongs to
	 */
	workspaceId: WorkspaceId,
	/**
	 * Folder to upload file to
	 */
	folderId: FolderId,
	/**
	 * Name of the file
	 */
	name: S.String,
	/**
	 * MIME type
	 */
	mimeType: S.String,
	/**
	 * File size in bytes
	 */
	size: S.Number,
	/**
	 * Storage key
	 */
	storageKey: S.String,
	/**
	 * Owner of the file
	 */
	ownerId: UserId,
}).annotations({ identifier: '@aipacto/workspace-domain/CreateFileInput' })
export type CreateFileInput = typeof CreateFileInput.Type

/**
 * Output for listing folder contents
 */
export const FolderContentsOutput = S.Struct({
	/**
	 * Subfolders in this folder
	 */
	folders: S.Array(EntityFolder),
	/**
	 * Documents in this folder
	 */
	documents: S.Array(EntityDocument),
	/**
	 * Files in this folder
	 */
	files: S.Array(EntityFile),
	/**
	 * Total count of items
	 */
	totalItems: S.Number,
}).annotations({ identifier: '@aipacto/workspace-domain/FolderContentsOutput' })
export type FolderContentsOutput = typeof FolderContentsOutput.Type
