import { getClerkInstance, useAuth, useClerk } from '@clerk/clerk-expo'
import type { AbstractPowerSyncDatabase } from '@powersync/common'
import { PowerSyncContext } from '@powersync/react'
import {
	Config,
	Effect,
	Either,
	Layer,
	ManagedRuntime,
	Option,
	Runtime,
} from 'effect'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { PowerSyncClient, PowerSyncDb } from '@aipacto/shared-infra-sqlite'
import { CoPage } from '@aipacto/shared-ui-core'
import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoProviders } from '@aipacto/shared-utils-logging'
import {
	ClerkService,
	// ClerkServiceLive,
	PowerSyncConnector,
	PowerSyncConnectorLive,
} from '~utils'

const log = logExpoProviders.getChildCategory('powersync-provider')

const clerkInstance = getClerkInstance({
	publishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
})

const AppLayer = Layer.mergeAll(
	PowerSyncConnectorLive({
		powerSyncUrl: Config.string('EXPO_PUBLIC_POWERSYNC_URL'),
	}).pipe(Layer.provideMerge(ClerkService.Live(clerkInstance as any))),
	PowerSyncClient.Live(
		Config.all({
			dbSqliteName: Config.string('EXPO_PUBLIC_DATABASE_SQLITE_NAME'),
			nodeEnv: Config.string('EXPO_PUBLIC_MODE'),
		}),
	).pipe(Layer.provide(PowerSyncDb.Live)),
)
const AppRuntime = ManagedRuntime.make(AppLayer)

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
	const { t } = useTranslation()
	const { isLoaded: isClerkLoaded } = useAuth()

	const [powerSyncClient, setPowerSyncClient] =
		useState<AbstractPowerSyncDatabase | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const unsubscribeRef = useRef<(() => void) | undefined>()
	const sessionListenerRef = useRef<(() => void) | undefined>()
	const mounted = useRef(true)

	// Set mounted flag on component mount
	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	useEffect(() => {
		// Don't initialize until Clerk is loaded
		if (!isClerkLoaded) {
			return
		}

		const initialize = async () => {
			log.debug('Starting PowerSync initialization')

			try {
				// // Get PowerSync configuration
				// const config = await Effect.runPromise(
				// 	Config.all({
				// 		powerSyncUrl: Config.string('EXPO_PUBLIC_POWERSYNC_URL'),
				// 	}),
				// )

				if (!mounted.current) return

				// Initialize PowerSync
				const result = await AppRuntime.runPromise(
					Effect.gen(function* () {
						const client = yield* PowerSyncClient
						const connector = yield* PowerSyncConnector

						// Initialize client
						yield* Effect.promise(() => client.init())
						log.debug('PowerSyncClient initialized')

						// Register listeners
						const unsubscribe = connector.registerListener({
							initialized: () => {
								log.debug('PowerSync initialized via listener callback')

								if (mounted.current) {
									requestAnimationFrame(() => {
										setIsLoading(false)
									})
								}
							},
							sessionUpdated: session => {
								if (Either.isRight(session)) {
									log.debug('Session updated', { session: session.right })

									// Always ensure loading is done after any session update
									if (mounted.current && isLoading) {
										requestAnimationFrame(() => {
											setIsLoading(false)
										})
									}

									// Handle session update
									const sessionExists =
										Either.isRight(session) && Option.isSome(session.right)

									log.debug(
										`Session updated: ${sessionExists ? 'exists' : 'missing'}`,
									)
								} else if (Either.isLeft(session)) {
									log.error('Session update error', { error: session.left })
									if (mounted.current) {
										setError(
											session.left instanceof Error
												? session.left.message
												: t('misc.err.session_failed'),
										)

										if (isLoading) setIsLoading(false)
									}
								}
							},
						})

						// Connect client and connector
						client.connect(connector)

						// Set up Clerk session listener
						const sessionListener = yield* ClerkService.pipe(
							Effect.flatMap(clerkService =>
								clerkService.addSessionListener(() => {
									// Update session when Clerk session changes
									AppRuntime.runPromise(connector.updateSession()).catch(
										error => {
											log.error('Failed to update PowerSync session', {
												error,
											})
										},
									)
								}),
							),
						)

						return {
							client: client as AbstractPowerSyncDatabase,
							unsubscribe,
							sessionListener,
						}
					}),
				)

				if (mounted.current) {
					unsubscribeRef.current = result.unsubscribe
					sessionListenerRef.current = result.sessionListener
					setPowerSyncClient(result.client)
					log.debug('PowerSync setup complete')
					setIsLoading(false)
				}
			} catch (error) {
				log.error('Unhandled error in PowerSync initialization', { error })
				if (mounted.current) {
					setError(t('misc.err.init_failed'))
					setIsLoading(false)
				}
			}
		}

		initialize()

		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current()
			}
			if (sessionListenerRef.current) {
				sessionListenerRef.current()
			}
		}
	}, [isClerkLoaded, t, isLoading])

	if (!isClerkLoaded || isLoading || !powerSyncClient) {
		return <CoPage componentName='powersync-provider' isLoading />
	}

	if (error) {
		return <CoPage componentName='powersync-provider' error />
	}

	return (
		<PowerSyncContext.Provider value={powerSyncClient}>
			{children}
		</PowerSyncContext.Provider>
	)
}
