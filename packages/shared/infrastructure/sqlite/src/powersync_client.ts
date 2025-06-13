import { Config, Context, Effect, Layer } from 'effect'

import {
	type PowerSyncClientConfig,
	SqliteSchema,
} from './powersync_client_types'
import { PowerSyncDb } from './powersync_db'

const make = (config: PowerSyncClientConfig) =>
	Effect.map(
		PowerSyncDb,
		PowerSyncDatabase =>
			new PowerSyncDatabase({
				schema: SqliteSchema,
				database: {
					dbFilename: `${config.dbSqliteName}.sqlite`,
					debugMode: config.nodeEnv === 'development',
				},
			}),
	)

export class PowerSyncClient extends Context.Tag('PowerSyncClient')<
	PowerSyncClient,
	Effect.Effect.Success<ReturnType<typeof make>>
>() {
	static readonly Live = (config: Config.Config.Wrap<PowerSyncClientConfig>) =>
		Config.unwrap(config).pipe(Effect.flatMap(make), Layer.effect(this))
}
