import { toPowerSyncSchema } from '@aipacto/shared-utils-powersync'
import { EntityDocument } from '@aipacto/workspace-domain'

export interface PowerSyncClientConfig {
	readonly dbSqliteName: string
	readonly nodeEnv: string
}

/**
 * Convert tables to PowerSync schema
 */
export const SqliteSchema = toPowerSyncSchema({
	documents: EntityDocument,
})
