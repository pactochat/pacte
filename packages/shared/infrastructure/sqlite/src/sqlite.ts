import type { AbstractPowerSyncDatabase } from '@powersync/common'
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver'
import { Context, Data, Effect, Layer } from 'effect'

import {
	CustomSerializePlugin,
	type Database,
} from '@aipacto/shared-infra-kysely'
import { PowerSyncClient } from './powersync_client'

const make = Effect.map(PowerSyncClient, client =>
	wrapPowerSyncWithKysely<Database>(client as AbstractPowerSyncDatabase, {
		plugins: [new CustomSerializePlugin()],
		// log: ['query', 'error'], // For debugging
		// log: ['error'], // For debugging
	}),
)

export class SqliteDb extends Context.Tag('SqliteDb')<
	SqliteDb,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make)
}

export class ErrorSqliteQuery extends Data.TaggedError('ErrorSqliteQuery')<{
	readonly error?: any
}> {}
