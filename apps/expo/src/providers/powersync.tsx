import { useAuth } from '@clerk/clerk-expo'
import type { AbstractPowerSyncDatabase } from '@powersync/common'
import { PowerSyncContext } from '@powersync/react'
import { Config, type Context, Effect, Either, Option, pipe } from 'effect'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { PowerSyncClient } from '@aipacto/shared-infra-sqlite'
import { CoPage } from '@aipacto/shared-ui-core'
import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoProviders } from '@aipacto/shared-utils-logging'
import { PowerSyncConnector, RuntimeClient } from '~utils'

const log = logExpoProviders.getChildCategory('powersync-provider')

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
	const { t } = useTranslation()
	const { getToken, sessionId, isLoaded: isClerkLoaded } = useAuth()
	const [powerSyncClient, setPowerSyncClient] = useState<Context.Tag.Service<
		typeof PowerSyncClient
	> | null>(null)
	const [powerSyncConnector, setPowerSyncConnector] =
		useState<Context.Tag.Service<typeof PowerSyncConnector> | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const unsubscribeRef = useRef<(() => void) | undefined>()
	const mounted = useRef(true)
	const prevSessionIdRef = useRef(sessionId)

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
				// Get PowerSync client from runtime
				const client = await RuntimeClient.runPromise(PowerSyncClient)

				// Get config for connector
				const config = await Effect.runPromise(
					Config.all({
						powerSyncUrl: Config.string('EXPO_PUBLIC_POWERSYNC_URL'),
						jwtTemplate: Config.option(
							Config.string('EXPO_PUBLIC_POWERSYNC_JWT_TEMPLATE'),
						),
					}).pipe(
						Config.map(c => ({
							powerSyncUrl: c.powerSyncUrl,
							jwtTemplate: Option.getOrUndefined(c.jwtTemplate),
							auth: { getToken, sessionId },
						})),
					),
				)

				// Create connector directly
				const connector = await Effect.runPromise(
					PowerSyncConnector.make(config),
				)

				// Initialize client
				await client.init()
				log.debug('PowerSyncClient initialized')

				// Initialize connector
				await connector.init()
				log.debug('PowerSyncConnector initialized')

				// Register listeners and connect
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

				// Store unsubscribe function
				if (mounted.current) {
					unsubscribeRef.current = unsubscribe
					setPowerSyncClient(client)
					setPowerSyncConnector(connector)

					// This handles the case where no session event occurs
					log.debug('PowerSync setup complete')
					setIsLoading(false)
				}
			} catch (error) {
				log.error('Unhandled error in PowerSync initialization', { error })
				if (mounted.current) setError(t('misc.err.init_failed'))
			}
		}

		initialize()

		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current()
			}
		}
	}, [isClerkLoaded, getToken, sessionId, t]) // Include auth dependencies

	// Handle session updates when auth changes
	useEffect(() => {
		if (
			powerSyncConnector &&
			isClerkLoaded &&
			sessionId !== prevSessionIdRef.current
		) {
			log.debug('Updating PowerSync session due to auth change')
			powerSyncConnector.updateSession().catch(error => {
				log.error('Failed to update PowerSync session', { error })
			})
			prevSessionIdRef.current = sessionId
		}
	}, [sessionId, powerSyncConnector, isClerkLoaded])

	if (!isClerkLoaded || isLoading || !powerSyncClient || !powerSyncConnector) {
		return <CoPage componentName='powersync-provider' isLoading />
	}

	if (error) {
		return <CoPage componentName='powersync-provider' error />
	}

	return (
		<PowerSyncContext.Provider
			value={powerSyncClient as AbstractPowerSyncDatabase}
		>
			{children}
		</PowerSyncContext.Provider>
	)
}
