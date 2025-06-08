import {
	type AbstractPowerSyncDatabase,
	BaseObserver,
	type PowerSyncBackendConnector,
	type PowerSyncCredentials,
} from '@powersync/react-native'
import {
	Array,
	Config,
	Context,
	Data,
	Effect,
	Either,
	Layer,
	Option,
	pipe,
} from 'effect'

import {
	type PowerSyncCrudEntryOutputJSON,
	TableWorkspaceNames,
} from '@aipacto/shared-infra-kysely'
import { logExpoProviders } from '@aipacto/shared-utils-logging'
import {
	type ConnectorListener,
	type PowerSyncConfig,
	SessionNotFound,
	getSessionFromAuth,
} from './powersync_connector_types'

class ErrorPowerSyncTransaction extends Data.TaggedError(
	'ErrorPowerSyncTransaction',
) {}

const log = logExpoProviders.getChildCategory('powersync_connector')

const make = (config: PowerSyncConfig) =>
	Effect.map(Effect.all({}), () => {
		class Connector
			extends BaseObserver<ConnectorListener>
			implements PowerSyncBackendConnector
		{
			public override readonly listeners: Set<Partial<ConnectorListener>> =
				new Set()
			ready = false
			private _session: Option.Option<
				import('./powersync_connector_types').BasicSession
			> = Option.none()

			async init() {
				log.debug('Initializing...')
				if (this.ready) {
					return
				}

				const session = await Effect.runPromise(
					getSessionFromAuth(config.auth, config.jwtTemplate).pipe(
						Effect.either,
					),
				)

				if (
					Either.isLeft(session) ||
					(Either.isRight(session) && Option.isNone(session.right))
				) {
					log.debug('No session found')
					this.ready = false
					this._session = Option.none()
				} else {
					this.ready = true
					this._session = session.right
				}

				log.debug('Initialized')
				this.iterateListeners(cb => {
					cb.sessionUpdated?.(session)
					cb.initialized?.()
				})
			}

			async updateSession(): Promise<void> {
				const session = await Effect.runPromise(
					getSessionFromAuth(config.auth, config.jwtTemplate).pipe(
						Effect.either,
					),
				)

				if (
					Either.isLeft(session) ||
					(Either.isRight(session) && Option.isNone(session.right))
				) {
					log.debug('No session found')
					this._session = Option.none()
					this.iterateListeners(cb =>
						cb.sessionUpdated?.(Either.right(Option.none())),
					)
					return
				}

				log.debug('Session found')
				this._session = session.right
				this.iterateListeners(cb => cb.sessionUpdated?.(session))
			}

			async fetchCredentials(): Promise<PowerSyncCredentials | null> {
				const session = await Effect.runPromise(
					getSessionFromAuth(config.auth, config.jwtTemplate).pipe(
						Effect.map(sessionOption => {
							this._session = sessionOption
							if (Option.isNone(sessionOption)) {
								return null
							}

							const credentials: PowerSyncCredentials = {
								endpoint: config.powerSyncUrl,
								token: sessionOption.value.jwt ?? '',
							}

							if (sessionOption.value.expirationTime !== undefined) {
								credentials.expiresAt = new Date(
									sessionOption.value.expirationTime,
								)
							}

							// Expiration date for logging
							const expiresAtFormatted = credentials.expiresAt
								? `${credentials.expiresAt.getDate().toString().padStart(2, '0')} ${credentials.expiresAt.getHours().toString().padStart(2, '0')}:${credentials.expiresAt.getMinutes().toString().padStart(2, '0')}`
								: 'unknown'
							log.debug(
								`Fetched credentials for powerSyncUrl=${credentials.endpoint} expires on day ${expiresAtFormatted}`,
							)

							return credentials
						}),
						Effect.catchAll(error => {
							log.error('Failed to fetch credentials', { error })
							throw error
						}),
					),
				)

				return session
			}

			uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
				log.debug('Uploading data...')

				return Effect.runPromise(
					Effect.gen(function* () {
						const transaction = yield* Effect.tryPromise({
							try: () => database.getNextCrudTransaction(),
							catch: error => {
								log.error('Failed to get next CRUD transaction', { error })
								return new ErrorPowerSyncTransaction()
							},
						})

						if (!transaction) return

						try {
							if (transaction.crud.length === 0) {
								yield* Effect.tryPromise(() => transaction.complete())
								return
							}

							// Get current session for API authentication
							const sessionOption = yield* getSessionFromAuth(
								config.auth,
								config.jwtTemplate,
							)

							const session = yield* pipe(
								sessionOption,
								Effect.fromOption(
									() =>
										new SessionNotFound({
											message: 'No authentication session available',
										}),
								),
							)

							const token = session.jwt

							// Convert CRUD operations to the expected format
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
							// For now, just log the operations
							log.debug('Would upload operations', {
								operations: body.length,
								types: [...new Set(body.map(op => op.type))],
							})

							// Example API call structure (to be implemented):
							// const response = yield* Effect.tryPromise({
							//   try: async () => {
							//     const res = await fetch(`${apiUrl}/sync`, {
							//       method: 'POST',
							//       headers: {
							//         'Content-Type': 'application/json',
							//         'Authorization': `Bearer ${token}`
							//       },
							//       body: JSON.stringify({ operations: body })
							//     })
							//     if (!res.ok) {
							//       const error = await res.json()
							//       throw new Error(error.message || `HTTP ${res.status}`)
							//     }
							//     return res.json()
							//   },
							//   catch: error => {
							//     log.error('Upload failed', { error })
							//     // Check if error is fatal (e.g., validation errors)
							//     // If fatal, we should complete the transaction to avoid blocking
							//     throw error
							//   }
							// })

							yield* Effect.tryPromise(() => transaction.complete())
							log.debug('Transaction completed successfully')
						} catch (error) {
							// If we have an error after getting the transaction,
							// we need to complete it to avoid blocking the queue
							yield* Effect.tryPromise(() => transaction.complete())
							throw error
						}
					}).pipe(
						Effect.catchAll(error => {
							log.error('Upload data failed', { error })
							return Effect.fail(error)
						}),
					),
				)
			}
		}

		return new Connector()
	})

export class PowerSyncConnector extends Context.Tag('PowerSyncConnector')<
	PowerSyncConnector,
	Effect.Effect.Success<ReturnType<typeof make>>
>() {
	static readonly make = make
	static readonly layer = (config: Config.Config.Wrap<PowerSyncConfig>) =>
		Config.unwrap(config).pipe(Effect.flatMap(make), Layer.effect(this))
}
