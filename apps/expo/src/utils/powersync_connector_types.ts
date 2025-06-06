import { Data, Effect, type Either, Option, Schema } from 'effect'

import { logExpoProviders } from '@aipacto/shared-utils-logging'

const log = logExpoProviders.getChildCategory('powersync_connector')

export class BasicSession extends Schema.Class<BasicSession>(
	'@aipacto/shared-infra-ui-providers/BasicSession',
)({
	jwt: Schema.String,
	expirationTime: Schema.Date,
}) {}

// Define error types using Data.TaggedError
export class SessionNotFound extends Data.TaggedError('SessionNotFound') {}

export class ErrorTokenFetch extends Data.TaggedError('ErrorTokenFetch')<{
	readonly cause?: unknown
}> {}

class InvalidJWTFormat extends Data.TaggedError('InvalidJWTFormat') {}

class MissingJWTPayload extends Data.TaggedError('MissingJWTPayload') {}

class InvalidToken extends Data.TaggedError('InvalidToken') {}

export type BasicSessionError =
	// SessionNotFound |
	ErrorTokenFetch | MissingJWTPayload

export interface ClerkAuthFunctions {
	getToken: (options?: { template?: string }) => Promise<string | null>
	sessionId: string | null | undefined
}

export interface PowerSyncConfig {
	readonly powerSyncUrl: string
	readonly jwtTemplate?: string
	readonly auth: ClerkAuthFunctions
}

export type ConnectorListener = {
	initialized: () => void
	sessionUpdated: (
		session: Either.Either<Option.Option<BasicSession>, BasicSessionError>,
	) => void
}

/**
 * Decodes a JWT token to extract the expiration time
 */
function decodeJWT(token: string) {
	return Effect.gen(function* () {
		const parts = token.split('.')

		if (parts.length !== 3) return yield* Effect.fail(new InvalidJWTFormat())

		const payload = parts[1]
		if (!payload) return yield* Effect.fail(new MissingJWTPayload())

		const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))

		return Schema.decodeUnknownSync(
			Schema.Struct({ exp: Schema.optional(Schema.Number) }),
		)(decoded)
	})
}

/**
 * Fetch the current session using Clerk auth functions
 * @param auth - Clerk auth functions
 * @param jwtTemplate - Optional name of a custom JWT template to use
 */
export function getSessionFromAuth(
	auth: ClerkAuthFunctions,
	jwtTemplate?: string,
) {
	const { getToken, sessionId } = auth

	// Check if there's an active session
	if (!sessionId) {
		log.debug('No active Clerk session')
		return Effect.succeed(Option.none())
	}

	// Get the JWT token from Clerk
	const tokenOptions = jwtTemplate ? { template: jwtTemplate } : {}

	return Effect.tryPromise({
		try: () => getToken(tokenOptions),
		catch: error => {
			log.error('Error getting token from Clerk', { error })
			return new ErrorTokenFetch({ cause: error })
		},
	}).pipe(
		Effect.flatMap(token => {
			if (!token) {
				log.debug('No token available from Clerk')
				return Effect.succeed(Option.none())
			}

			return decodeJWT(token).pipe(
				Effect.map(decoded => {
					let expirationTime: Date

					if (decoded.exp) {
						expirationTime = new Date(decoded.exp * 1000)
					} else {
						// If no exp claim, default to 1 minute from now (Clerk's default TTL)
						expirationTime = new Date(Date.now() + 60 * 1000)
					}

					const session = BasicSession.make({
						jwt: token,
						expirationTime,
					})

					log.debug('Session created', {
						jwt: `${session.jwt.slice(0, 20)}...`,
						expirationTime: session.expirationTime,
					})

					return Option.some(session)
				}),
				Effect.catchTag('InvalidJWTFormat', _ => {
					log.warn('Failed to decode JWT, returning session without expiration')
					const session = BasicSession.make({
						jwt: token,
						expirationTime: new Date(Date.now() + 60 * 1000), // Default 1 minute
					})
					return Effect.succeed(Option.some(session))
				}),
			)
		}),
		Effect.catchAll(error => {
			log.error('Unexpected error in getSessionFromAuth', { error })
			return Effect.fail(error)
		}),
	)
}
