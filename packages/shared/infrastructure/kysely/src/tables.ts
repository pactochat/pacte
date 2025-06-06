import type { Insertable, Selectable, Updateable } from 'kysely'

import type { EntityDocument } from '@aipacto/workspace-domain'

// ========================
// Database
// =========

/**
 * Database with all Kysely-compatible tables
 */
type Database = {
	// Workspace
	documents: TableDocuments
}

export const TableWorkspaceNames = {
	documents: 'documents',
} as const
export type TableWorkspaceNames =
	(typeof TableWorkspaceNames)[keyof typeof TableWorkspaceNames]

// ========================
// Tables Workspace
// ===========

type TableDocuments = typeof EntityDocument.Encoded
type DocumentQuery = Selectable<TableDocuments>
type DocumentInsert = Insertable<TableDocuments>
type DocumentUpdate = Updateable<TableDocuments>

export type {
	Database,
	// Tables Workspace
	TableDocuments,
	// Queries Workspace
	DocumentQuery,
	DocumentInsert,
	DocumentUpdate,
}
