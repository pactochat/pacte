import { Schema as S } from 'effect'

import { Entity } from '@aipacto/shared-domain'
import {
	DocumentId,
	FileId,
	FolderId,
	GroupId,
	OrganizationId,
	UserId,
	WorkspaceId,
} from './types'

export class EntityOrganization extends S.Class<EntityOrganization>(
	'@aipacto/workspace-domain/EntityOrganization',
)({
	...Entity.fields,
	id: OrganizationId,
	/**
	 * Name of the organization
	 */
	name: S.String,
	/**
	 * Organization settings
	 */
	settings: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	/**
	 * Metadata about the organization
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}

export class EntityWorkspace extends S.Class<EntityWorkspace>(
	'@aipacto/workspace-domain/EntityWorkspace',
)({
	...Entity.fields,
	id: WorkspaceId,
	/**
	 * Organization this workspace belongs to
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
	/**
	 * Root folder for this workspace
	 */
	rootFolderId: FolderId,
	/**
	 * Metadata about the workspace
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}

export class EntityFolder extends S.Class<EntityFolder>(
	'@aipacto/workspace-domain/EntityFolder',
)({
	...Entity.fields,
	id: FolderId,
	/**
	 * Workspace this folder belongs to
	 */
	workspaceId: WorkspaceId,
	/**
	 * Parent folder ID (null for root folders)
	 */
	parentId: S.NullOr(FolderId),
	/**
	 * Name of the folder
	 */
	name: S.String,
	/**
	 * Full path from root
	 */
	path: S.String,
	/**
	 * Owner of the folder
	 */
	ownerId: UserId,
	/**
	 * Folder metadata
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}

/**
 * Document formats
 */
export const DocumentFormat = S.Union(
	S.Literal('loro'),
	S.Literal('markdown'),
	S.Literal('html'),
	S.Literal('plain'),
	S.Literal('json'),
)
export type DocumentFormat = typeof DocumentFormat.Type

/**
 * Document status
 */
export const DocumentStatus = S.Union(
	S.Literal('draft'),
	S.Literal('published'),
)
export type DocumentStatus = typeof DocumentStatus.Type

export class EntityDocument extends S.Class<EntityDocument>(
	'@aipacto/workspace-domain/EntityDocument',
)({
	...Entity.fields,
	id: DocumentId,
	/**
	 * Workspace this document belongs to
	 */
	workspaceId: WorkspaceId,
	/**
	 * Folder containing this document
	 */
	folderId: FolderId,
	/**
	 * Name of the document
	 */
	name: S.String,
	/**
	 * Document format
	 */
	format: DocumentFormat,
	/**
	 * Current status
	 */
	status: DocumentStatus,
	/**
	 * Owner of the document
	 */
	ownerId: UserId,
	/**
	 * Content version number
	 */
	version: S.Number,
	/**
	 * Size in bytes of the content
	 */
	contentSize: S.optional(S.Number),
	/**
	 * Document metadata
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}

export class EntityFile extends S.Class<EntityFile>(
	'@aipacto/workspace-domain/EntityFile',
)({
	...Entity.fields,
	id: FileId,
	/**
	 * Workspace this file belongs to
	 */
	workspaceId: WorkspaceId,
	/**
	 * Folder containing this file
	 */
	folderId: FolderId,
	/**
	 * Name of the file
	 */
	name: S.String,
	/**
	 * MIME type of the file
	 */
	mimeType: S.String,
	/**
	 * Size in bytes
	 */
	size: S.Number,
	/**
	 * Storage key/path in the storage system
	 */
	storageKey: S.String,
	/**
	 * Owner of the file
	 */
	ownerId: UserId,
	/**
	 * File metadata
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}

/**
 * Group entity for managing collections of users
 */
export class EntityGroup extends S.Class<EntityGroup>(
	'@aipacto/workspace-domain/EntityGroup',
)({
	...Entity.fields,
	id: GroupId,
	/**
	 * Organization this group belongs to
	 */
	organizationId: OrganizationId,
	/**
	 * Name of the group
	 */
	name: S.String,
	/**
	 * Description of the group
	 */
	description: S.optional(S.String),
	/**
	 * Group metadata
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}) {}
