import { trace } from '@opentelemetry/api'
import type { FastifyPluginCallback } from 'fastify'
import type { SessionRequest } from 'supertokens-node/framework/fastify'
import { verifySession } from 'supertokens-node/recipe/session/framework/fastify'
import UserMetadata from 'supertokens-node/recipe/usermetadata'

import { withTrace } from '../plugins/telemetry/index.js'

export const routesCreatorMetadata: FastifyPluginCallback = (
	fastify,
	opts,
	done,
) => {
	fastify.post(
		'/creator-metadata',
		{
			preHandler: verifySession(),
			schema: {
				body: {
					type: 'object',
					properties: {
						creatorId: { type: 'string', format: 'uuid' },
					},
				},
			},
		},
		async (request: SessionRequest, reply) => {
			return await withTrace(
				'metadata.update',
				async () => {
					const session = request.session
					if (!session) {
						return reply.code(401).send({ error: 'Unauthorized' })
					}

					const userId = session.getUserId()
					const { creatorId } = request.body as { creatorId?: string }

					try {
						await withTrace(
							'metadata.updateUserMetadata',
							async () => {
								// Only update if creatorId is provided
								if (creatorId) {
									await UserMetadata.updateUserMetadata(userId, {
										creatorId,
									})
								}
							},
							{
								'user.id': userId,
								'creator.id': creatorId || 'not-provided',
							},
						)

						return reply.code(200).send({ message: 'Creator metadata updated' })
					} catch (error) {
						const span = trace.getActiveSpan()
						if (span) {
							span.recordException(error as Error)
							span.setStatus({ code: 2 }) // Error
						}
						throw error
					}
				},
				{
					'request.path': request.url,
					'request.method': request.method,
				},
			)
		},
	)

	fastify.get(
		'/creator-metadata',
		{
			preHandler: verifySession(),
		},
		async (request: SessionRequest, reply) => {
			return await withTrace(
				'metadata.get',
				async () => {
					const session = request.session
					if (!session) {
						return reply.code(401).send({ error: 'Unauthorized' })
					}

					const userId = session.getUserId()
					try {
						const result = await withTrace(
							'metadata.getUserMetadata',
							async () => {
								return await UserMetadata.getUserMetadata(userId)
							},
							{
								'user.id': userId,
							},
						)

						const creatorId = result.metadata.creatorId as string | undefined
						if (!creatorId) {
							return reply.code(404).send({ error: 'Creator not found' })
						}

						return reply.code(200).send({ creatorId })
					} catch (error) {
						const span = trace.getActiveSpan()
						if (span) {
							span.recordException(error as Error)
							span.setStatus({ code: 2 }) // Error
						}
						throw error
					}
				},
				{
					'request.path': request.url,
					'request.method': request.method,
				},
			)
		},
	)

	done()
}
