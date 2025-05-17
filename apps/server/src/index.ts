import 'dotenv/config'
import { clerkPlugin } from '@clerk/fastify'
import formbodyPlugin from '@fastify/formbody'
import { Effect } from 'effect'
import Fastify from 'fastify'

import { Env } from '@pacto-chat/shared-utils-env'
import { logAppServer } from '@pacto-chat/shared-utils-logging'
import { routesConversations } from './routes/conversations'

async function main() {
	try {
		await Effect.runPromise(Env.load.pipe(Effect.provide(Env.Live)))
	} catch (error) {
		logAppServer.error(
			'Failed to bootstrap application',
			(error as Error).toString(),
		)
		process.exit(1)
	}

	logAppServer.info('Starting server at', process.env.SERVER_URL)

	const serverOptions = {
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

	const server = Fastify(serverOptions)

	// Register formbody plugin to parse form data (required by Clerk)
	logAppServer.info('Registering Formbody plugin')
	server.register(formbodyPlugin)

	server.register(clerkPlugin)

	logAppServer.info('Setting error handler')
	server.setErrorHandler((err, request, reply) => {
		// // Pass the error through Clerk (Clerk might send a response immediately)
		// clerkErrorHandler()(err, request, reply)

		// Do any other fallback logic if the reply is not yet sent
		if (!reply.sent) {
			reply.status(500).send({ error: 'Internal Server Error' })
		}
	})

	// Routes
	logAppServer.info('Registering routes')
	await routesConversations(server)

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
