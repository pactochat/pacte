import { Config, Effect, Layer, Logger } from 'effect'

export const LogLevelLive = Config.logLevel('MIN_LOG_LEVEL').pipe(
	Effect.andThen(level => Logger.minimumLogLevel(level)),
	Layer.unwrapEffect,
)
