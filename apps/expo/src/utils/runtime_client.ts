import { Config, ConfigProvider, Layer, LogLevel, ManagedRuntime } from 'effect'
import { Option } from 'effect'

// import {
// 	RepoDocument
// } from '@aipacto/workspace-repos-sqlite'
import { PowerSyncClient, PowerSyncDb } from '@aipacto/shared-infra-sqlite'
import { LogLevelLive } from '@aipacto/shared-utils-logging'
import { PowerSyncConnector } from './powersync_connector.js'

const PowerSyncClientConfig = Config.all({
	dbSqliteName: Config.string('EXPO_PUBLIC_DATABASE_SQLITE_NAME'),
	nodeEnv: Config.string('EXPO_PUBLIC_MODE'),
})
const PowerSyncConfig = Config.all({
	powerSyncUrl: Config.string('EXPO_PUBLIC_POWERSYNC_URL'),
	jwtTemplate: Config.option(
		Config.string('EXPO_PUBLIC_POWERSYNC_JWT_TEMPLATE'),
	),
}).pipe(
	Config.map(config => ({
		powerSyncUrl: config.powerSyncUrl,
		jwtTemplate: Option.getOrUndefined(config.jwtTemplate),
	})),
)

const PowerSyncClientLive = PowerSyncClient.Live(PowerSyncClientConfig).pipe(
	Layer.provide(PowerSyncDb.Live),
)
// const ReposLive = Layer.mergeAll(
// 	// // Workspace
// 	// RepoDocument
// ).pipe(Layer.provide(PowerSyncClientLive))
const PowerSyncConnectorLive = PowerSyncConnector.layer(PowerSyncConfig)
// .pipe(
// 	Layer.provide(Layer.mergeAll(WebClientLive)),
// )
const LoggingLive = LogLevelLive.pipe(
	Layer.provide(
		Layer.setConfigProvider(
			ConfigProvider.fromMap(
				// new Map([['MIN_LOG_LEVEL', LogLevel.Warning.label]]),
				new Map([['MIN_LOG_LEVEL', LogLevel.Debug.label]]),
			),
		),
	),
)

const MainLayer = Layer.mergeAll(
	PowerSyncClientLive,
	PowerSyncConnectorLive,
	// ReposLive,
).pipe(Layer.provide(LoggingLive))

export const RuntimeClient = ManagedRuntime.make(MainLayer)
