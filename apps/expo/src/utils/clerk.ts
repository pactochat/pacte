import type { BrowserClerk, HeadlessBrowserClerk } from '@clerk/clerk-react'
import { Context, Data, Effect, Layer, Option } from 'effect'

export class ErrorGettingSessionToken extends Data.TaggedError(
	'ErrorGettingSessionToken',
) {}

export class ErrorDecodingJWT extends Data.TaggedError('ErrorDecodingJWT') {}

export class BasicSession extends Data.TaggedClass('BasicSession')<{
	readonly jwt: string
	readonly expirationTime: Date
}> {}

/**
 * ClerkService with session management functionality
 */
export class ClerkService extends Context.Tag('ClerkService')<
	ClerkService,
	{
		readonly getSessionToken: () => Effect.Effect<
			Option.Option<string>,
			ErrorGettingSessionToken,
			never
		>
		readonly getSessionId: Effect.Effect<Option.Option<string>>
		readonly getSession: () => Effect.Effect<
			Option.Option<BasicSession>,
			ErrorGettingSessionToken | ErrorDecodingJWT,
			never
		>
		readonly addSessionListener: (
			callback: (sessionId: Option.Option<string>) => void,
		) => Effect.Effect<() => void>
	}
>() {
	static readonly Live = (clerk: HeadlessBrowserClerk | BrowserClerk) =>
		Layer.effect(
			this,
			Effect.succeed({
				getSessionToken: () =>
					Effect.tryPromise({
						try: async () => {
							const token = await clerk.session?.getToken()
							return token ? Option.some(token) : Option.none()
						},
						catch: () => new ErrorGettingSessionToken(),
					}),

				getSessionId: Effect.sync(() => {
					const id = clerk.session?.id
					return id ? Option.some(id) : Option.none()
				}),

				getSession: () =>
					Effect.gen(function* () {
						// Check if there's an active session
						const sessionId = yield* Effect.sync(() => {
							const id = clerk.session?.id
							return id ? Option.some(id) : Option.none()
						})

						if (Option.isNone(sessionId)) {
							return Option.none<BasicSession>()
						}

						// Get the token
						const tokenOption = yield* Effect.tryPromise({
							try: async () => {
								const token = await clerk.session?.getToken()
								return token ? Option.some(token) : Option.none()
							},
							catch: () => new ErrorGettingSessionToken(),
						})

						if (Option.isNone(tokenOption)) {
							return Option.none<BasicSession>()
						}

						const token = tokenOption.value

						// Decode JWT for expiration
						const decoded = yield* Effect.try({
							try: () => {
								const parts = token.split('.')
								if (parts.length !== 3 || !parts[1]) {
									throw new ErrorDecodingJWT()
								}
								const decoded = atob(
									parts[1].replace(/-/g, '+').replace(/_/g, '/'),
								)
								return JSON.parse(decoded)
							},
							catch: () => new ErrorDecodingJWT(),
						}).pipe(Effect.orElse(() => Effect.succeed({ exp: undefined })))

						const expirationTime = decoded.exp
							? new Date(decoded.exp * 1000)
							: new Date(Date.now() + 60 * 1000) // Default 1 minute

						return Option.some(
							new BasicSession({
								jwt: token,
								expirationTime,
							}),
						)
					}),

				addSessionListener: callback =>
					Effect.sync(() => {
						// Clerk's addListener returns an unsubscribe function
						return clerk.addListener(({ session }) => {
							callback(session?.id ? Option.some(session.id) : Option.none())
						})
					}),
			}),
		)
}

// Test implementation for unit testing
export const ClerkServiceTest = (mockSession?: {
	id: string
	token: string
	expirationTime?: Date
}) =>
	Layer.succeed(ClerkService, {
		getSessionToken: () =>
			Effect.succeed(
				mockSession ? Option.some(mockSession.token) : Option.none(),
			),

		getSessionId: Effect.succeed(
			mockSession ? Option.some(mockSession.id) : Option.none(),
		),

		getSession: () =>
			Effect.succeed(
				mockSession
					? Option.some(
							new BasicSession({
								jwt: mockSession.token,
								expirationTime:
									mockSession.expirationTime ||
									new Date(Date.now() + 60 * 1000),
							}),
						)
					: Option.none(),
			),

		addSessionListener: () =>
			Effect.succeed(() => {
				// No-op unsubscribe for tests
			}),
	})
