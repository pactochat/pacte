import type { Server } from 'node:https'
import formbodyPlugin from '@fastify/formbody'
import { Effect } from 'effect'
import fastify, { type FastifyHttpOptions } from 'fastify'
import { errorHandler as superTokensErrorHandler } from 'supertokens-node/framework/fastify'

import { Env } from '@pacto-chat/shared-utils-env'
import { logAppServer } from '@pacto-chat/shared-utils-logging'
import { corsPlugin } from './plugins/cors.js'
import { authenticationPlugin, initSupertokens } from './plugins/supertokens.js'
import { routesCreatorMetadata } from './routes/creator_metadata.js'

async function main() {
	try {
		await Effect.runPromise(Env.load.pipe(Effect.provide(Env.Live)))

		// Initialize Supertokens
		initSupertokens()
	} catch (error) {
		logAppServer.error(
			'Failed to bootstrap application',
			(error as Error).toString(),
		)
		process.exit(1)
	}

	logAppServer.info('Starting server at', process.env.SERVER_URL)

	const serverOptions: FastifyHttpOptions<Server> = {
		logger: {
			level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
			transport: {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
				},
			},
		},
		trustProxy: true, // Respect Caddy's forwarded headers
	}

	const server = fastify(serverOptions)

	server.register(corsPlugin)

	// Register formbody plugin to parse form data (required by SuperTokens)
	logAppServer.info('Registering Formbody plugin')
	server.register(formbodyPlugin)

	server.register(authenticationPlugin)

	logAppServer.info('Setting error handler')
	server.setErrorHandler((err, request, reply) => {
		// Telemetry: record the error on the current span
		const activeSpan = trace.getActiveSpan()
		if (activeSpan) {
			activeSpan.setStatus({ code: SpanStatusCode.ERROR })
			activeSpan.recordException(err)
		}

		// Pass the error through SuperTokens (SuperTokens might send a response immediately)
		superTokensErrorHandler()(err, request, reply)

		// Do any other fallback logic if the reply is not yet sent
		if (!reply.sent) {
			reply.status(500).send({ error: 'Internal Server Error' })
		}
	})

	// Routes
	logAppServer.info('Registering routes')
	server.register(routesCreatorMetadata)

	// Health check route
	server.get('/check', async () => {
		return { message: 'Health check' }
	})

	try {
		server.listen(
			{
				host: process.env.SERVER_HOST || '',
				port: Number.parseInt(process.env.SERVER_PORT || '', 10),
			},
			(err, address) => {
				if (err) throw err
				server.log.info(`Server listening at ${address}`)
			},
		)
	} catch (error) {
		if (error instanceof Error) {
			logAppServer.error(error.toString())
		} else {
			logAppServer.error('An unknown error occurred')
		}
	}
}

await main()
