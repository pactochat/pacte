import {
	type AbstractPowerSyncDatabase,
	BaseObserver,
	type PowerSyncBackendConnector,
	type PowerSyncCredentials,
} from '@powersync/react-native'
import {
	Config,
	Context,
	Data,
	Effect,
	Either,
	Layer,
	Option,
	Ref,
	pipe,
} from 'effect'

import {
	type PowerSyncCrudEntryOutputJSON,
	TableWorkspaceNames,
} from '@aipacto/shared-infra-kysely'
import { logExpoProviders } from '@aipacto/shared-utils-logging'
import {
	type BasicSession,
	ClerkService,
	type ErrorDecodingJWT,
	type ErrorGettingSessionToken,
} from './clerk'

const log = logExpoProviders.getChildCategory('powersync_connector')

export type ConnectorListener = {
	initialized: () => void
	sessionUpdated: (
		session: Either.Either<Option.Option<BasicSession>, Error>,
	) => void
}

class SessionNotFound extends Data.TaggedError('SessionNotFound')<{
	readonly message?: string
}> {}

class ErrorGettingNextPowerSyncTransaction extends Data.TaggedError(
	'ErrorGettingNextPowerSyncTransaction',
) {}

export interface PowerSyncConfig {
	readonly powerSyncUrl: string
}

export class PowerSyncConnector extends Context.Tag('PowerSyncConnector')<
	PowerSyncConnector,
	PowerSyncBackendConnector & {
		readonly updateSession: () => Effect.Effect<
			void,
			ErrorGettingSessionToken | ErrorDecodingJWT,
			never
		>
		readonly registerListener: (
			listener: Partial<ConnectorListener>,
		) => () => void
	}
>() {}

export const PowerSyncConnectorLive = (
	config: Config.Config.Wrap<PowerSyncConfig>,
) =>
	Layer.effect(
		PowerSyncConnector,
		Effect.gen(function* () {
			const clerk = yield* ClerkService

			// State refs
			const sessionRef = yield* Ref.make<Option.Option<BasicSession>>(
				Option.none(),
			)
			const readyRef = yield* Ref.make(false)
			const listenersRef = yield* Ref.make<Set<Partial<ConnectorListener>>>(
				new Set(),
			)

			// Helper to notify listeners
			const notifyListeners = (
				fn: (listener: Partial<ConnectorListener>) => void,
			) =>
				Effect.gen(function* () {
					const listeners = yield* Ref.get(listenersRef)
					listeners.forEach(fn)
				})

			const connector: PowerSyncBackendConnector & {
				updateSession: () => Effect.Effect<
					void,
					ErrorGettingSessionToken | ErrorDecodingJWT,
					never
				>
				registerListener: (listener: Partial<ConnectorListener>) => () => void
			} = {
				// async init() {
				// 	await Effect.runPromise(
				// 		Effect.gen(function* () {
				// 			const isReady = yield* Ref.get(readyRef)
				// 			if (isReady) return

				// 			const session = yield* clerk.getSession()
				// 			yield* Ref.set(sessionRef, session)
				// 			yield* Ref.set(readyRef, Option.isSome(session))

				// 			log.debug('Initialized')
				// 			yield* notifyListeners(listener => {
				// 				listener.sessionUpdated?.(Either.right(session))
				// 				listener.initialized?.()
				// 			})
				// 		}),
				// 	)
				// },

				async fetchCredentials() {
					return Effect.runPromise(
						Effect.gen(function* () {
							const session = yield* clerk.getSession()
							yield* Ref.set(sessionRef, session)

							if (Option.isNone(session)) {
								return null
							}

							const credentials = {
								endpoint: (yield* Config.unwrap(config)).powerSyncUrl,
								token: session.value.jwt,
								expiresAt: session.value.expirationTime,
							} satisfies PowerSyncCredentials

							const expiresAtFormatted = credentials.expiresAt
								? `${credentials.expiresAt.getDate().toString().padStart(2, '0')} ${credentials.expiresAt.getHours().toString().padStart(2, '0')}:${credentials.expiresAt.getMinutes().toString().padStart(2, '0')}`
								: 'unknown'
							log.debug(
								`Fetched credentials for powerSyncUrl=${credentials.endpoint} expires on day ${expiresAtFormatted}`,
							)

							return credentials
						}).pipe(
							Effect.catchAll(error => {
								log.error('Failed to fetch credentials', { error })
								return Effect.succeed(null)
							}),
						),
					)
				},

				async uploadData(database: AbstractPowerSyncDatabase) {
					await Effect.runPromise(
						Effect.gen(function* () {
							log.debug('Uploading data...')

							const transaction = yield* Effect.tryPromise({
								try: () => database.getNextCrudTransaction(),
								catch: error => {
									log.error('Failed to get next CRUD transaction', { error })
									return new ErrorGettingNextPowerSyncTransaction()
								},
							})

							if (!transaction) return

							if (transaction.crud.length === 0) {
								yield* Effect.promise(() => transaction.complete())
								return
							}

							const sessionOption = yield* clerk.getSession()
							const session = yield* pipe(
								sessionOption,
								Option.match({
									onNone: () =>
										Effect.fail(
											new SessionNotFound({
												message: 'No authentication session available',
											}),
										),
									onSome: Effect.succeed,
								}),
							)

							const body: PowerSyncCrudEntryOutputJSON[] = transaction.crud.map(
								(crud): PowerSyncCrudEntryOutputJSON => ({
									data: crud.opData,
									id: crud.id,
									op: crud.op,
									op_id: crud.clientId.toString(),
									type: TableWorkspaceNames[
										crud.table as keyof typeof TableWorkspaceNames
									],
									tx_id: crud.transactionId ?? null,
								}),
							)

							// TODO: Implement actual API call here
							log.debug('Would upload operations', {
								operations: body.length,
								types: [...new Set(body.map(op => op.type))],
							})

							yield* Effect.promise(() => transaction.complete())
						}).pipe(
							Effect.catchAll(error => {
								log.error('Upload data failed', { error })

								// Swallow the error
								return Effect.succeed(undefined)
							}),
						),
					)
				},

				updateSession() {
					return Effect.gen(function* () {
						const session = yield* clerk.getSession()
						yield* Ref.set(sessionRef, session)

						log.debug(
							Option.isSome(session) ? 'Session found' : 'No session found',
						)
						yield* notifyListeners(listener =>
							listener.sessionUpdated?.(Either.right(session)),
						)
					}).pipe(
						Effect.catchAll(error => {
							log.error('updateSession failed', { error })
							// Swallow the error to ensure the error type is `never`
							return Effect.succeed(undefined)
						}),
					)
				},

				registerListener(listener: Partial<ConnectorListener>) {
					Effect.runSync(
						Ref.update(listenersRef, set => {
							const newSet = new Set(set)
							newSet.add(listener)
							return newSet
						}),
					)

					// Return unsubscribe function
					return () => {
						Effect.runSync(
							Ref.update(listenersRef, set => {
								const newSet = new Set(set)
								newSet.delete(listener)
								return newSet
							}),
						)
					}
				},
			}

			return connector
		}),
	)
