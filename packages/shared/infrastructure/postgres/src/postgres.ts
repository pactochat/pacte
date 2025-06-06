import * as PgKysely from '@effect/sql-kysely/Pg'
import { PgClient } from '@effect/sql-pg'
import { Config, Context, Layer } from 'effect'

import type { Database } from '@aipacto/shared-infra-kysely'

const PgLive = PgClient.layerConfig(
	Config.all({
		database: Config.string('DB_DATABASE'),
		host: Config.string('DB_HOST'),
		username: Config.string('DB_USERNAME'),
		password: Config.redacted('DB_PASSWORD'),
		ssl: Config.boolean('DB_SSL'),
	}),
)

export class PgDB extends Context.Tag('PgDB')<
	PgDB,
	PgKysely.EffectKysely<Database>
>() {
	static readonly KyselyLive = Layer.effect(
		this,
		PgKysely.make<Database>(),
	).pipe(Layer.provide(PgLive))
}
