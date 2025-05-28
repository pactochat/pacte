import { CredentialsMethod, OpenFgaClient as SDKClient } from '@openfga/sdk'
import type { FgaObject } from '@openfga/sdk/dist/apiModel'
import { Config, Context, Effect, Layer } from 'effect'

import { logWorkspaceInfraAuthz } from '@aipacto/shared-utils-logging'
import { OpenFGAError } from './errors'

const make = Effect.gen(function* () {
	const apiUrl = yield* Config.string('OPENFGA_API_URL')
	const storeId = yield* Config.string('OPENFGA_STORE_ID')
	const apiToken = yield* Config.string('OPENFGA_API_TOKEN') // TODO: use `Config.redacted`

	logWorkspaceInfraAuthz.debug('Initializing OpenFGA client')

	const client = new SDKClient({
		apiUrl,
		storeId,
		credentials: apiToken
			? {
					method: CredentialsMethod.ApiToken,
					config: { token: apiToken },
				}
			: undefined,
	})

	// Test connection by trying to read the authorization model
	yield* Effect.tryPromise({
		try: async () => {
			await client.readLatestAuthorizationModel()
			logWorkspaceInfraAuthz.debug('Successfully connected to OpenFGA')
		},
		catch: error =>
			new OpenFGAError({
				operation: 'checkConnection',
				error,
			}),
	})

	return {
		check: (params: CheckParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.check({
						user: params.user,
						relation: params.relation,
						object: params.object,
						contextualTuples: params.contextualTuples ?? [],
					})
					return result.allowed ?? false
				},
				catch: error =>
					new OpenFGAError({
						operation: 'check',
						error,
					}),
			}),

		write: (writes: Tuple[]) =>
			Effect.tryPromise({
				try: async () => {
					await client.write({ writes })
					return undefined
				},
				catch: error =>
					new OpenFGAError({
						operation: 'write',
						error,
					}),
			}),

		delete: (deletes: Tuple[]) =>
			Effect.tryPromise({
				try: async () => {
					await client.write({ deletes })
					return undefined
				},
				catch: error =>
					new OpenFGAError({
						operation: 'delete',
						error,
					}),
			}),

		batchCheck: (checks: BatchCheckItem[]) =>
			Effect.tryPromise({
				try: async () => {
					const checksWithIds = checks.map(
						(item: BatchCheckItem, index: number) => ({
							...item,
							correlationId: item.correlationId ?? `check-${index}`,
						}),
					)

					const result = await client.batchCheck({
						checks: checksWithIds.map((i: BatchCheckItem) => ({
							user: i.user,
							relation: i.relation,
							object: i.object,
							correlationId: i.correlationId ?? '',
						})),
					})

					return checksWithIds.map((i: BatchCheckItem) => {
						const correlationId = i.correlationId ?? ''
						const found = result.result.find(
							r => r.correlationId === correlationId,
						)
						return {
							correlationId,
							allowed: found?.allowed ?? false,
						}
					})
				},
				catch: error =>
					new OpenFGAError({
						operation: 'batchCheck',
						error,
					}),
			}),

		listObjects: (params: ListObjectsParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.listObjects({
						user: params.user,
						relation: params.relation,
						type: params.type,
					})
					return result.objects ?? []
				},
				catch: error =>
					new OpenFGAError({
						operation: 'listObjects',
						error,
					}),
			}),

		listUsers: (params: ListUsersParams) =>
			Effect.tryPromise({
				try: async () => {
					const result = await client.listUsers({
						object: params.object,
						relation: params.relation,
						user_filters: params.userFilter ? [params.userFilter] : [],
					})

					return (
						result.users
							?.map(user => {
								if (user.object) {
									return `${user.object.type}:${user.object.id}`
								}
								if (user.userset) {
									return `${user.userset.type}:${user.userset.id}#${user.userset.relation}`
								}
								if (user.wildcard) {
									return `${user.wildcard.type}:*`
								}
								return ''
							})
							.filter(Boolean) ?? []
					)
				},
				catch: error =>
					new OpenFGAError({
						operation: 'listUsers',
						error,
					}),
			}),
	}
})

export class OpenFGAClient extends Context.Tag('OpenFGAClient')<
	OpenFGAClient,
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(OpenFGAClient, make)
}

// -------------------------------------------------------------
// Helper Types
// -------------------------------------------------------------

/** A single FGA tuple */
type Tuple = {
	user: string
	relation: string
	object: string
}

/** Parameters for a permission check */
interface CheckParams extends Tuple {
	contextualTuples?: Tuple[]
}

/** Parameters for listObjects */
interface ListObjectsParams {
	user: string
	relation: string
	type: string
}

/** Parameters for listUsers */
interface ListUsersParams {
	object: FgaObject
	relation: string
	userFilter?: { type: string; relation?: string }
}

/** Batch-check item */
interface BatchCheckItem extends Tuple {
	correlationId?: string
}
