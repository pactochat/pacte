import type { BrowserClerk, HeadlessBrowserClerk } from '@clerk/clerk-react'
import { Context, Effect, Layer, Option } from 'effect'

/**
 * ClerkService with only session-related functionality needed by PowerSyncConnector
 */
export class ClerkService extends Context.Tag('ClerkService')<
	ClerkService,
	{
		readonly getSessionToken: (options?: {
			template?: string
		}) => Effect.Effect<Option.Option<string>>
		readonly getSessionId: Effect.Effect<Option.Option<string>>
		readonly addSessionListener: (
			callback: (sessionId: Option.Option<string>) => void,
		) => Effect.Effect<() => void>
	}
>() {}

export const ClerkServiceLive = (clerk: HeadlessBrowserClerk | BrowserClerk) =>
	Layer.succeed(ClerkService, {
		getSessionToken: options =>
			Effect.promise(async () => {
				const token = await clerk.session?.getToken(options)
				return token ? Option.some(token) : Option.none()
			}),

		getSessionId: Effect.sync(() => {
			const id = clerk.session?.id
			return id ? Option.some(id) : Option.none()
		}),

		addSessionListener: callback =>
			Effect.sync(() => {
				// Clerk's addListener returns an unsubscribe function
				return clerk.addListener(({ session }) => {
					callback(session?.id ? Option.some(session.id) : Option.none())
				})
			}),
	})

// // Test implementation for unit testing
// export const ClerkServiceTest = (mockSession?: {
// 	id: string
// 	token: string
// }) =>
// 	Layer.succeed(ClerkService, {
// 		getSessionToken: () =>
// 			Effect.succeed(
// 				mockSession ? Option.some(mockSession.token) : Option.none(),
// 			),

// 		getSessionId: Effect.succeed(
// 			mockSession ? Option.some(mockSession.id) : Option.none(),
// 		),

// 		addSessionListener: () =>
// 			Effect.succeed(() => {
// 				// No-op unsubscribe for tests
// 			}),
// 	})
