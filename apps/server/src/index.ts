import 'dotenv/config'
import { clerkPlugin } from '@clerk/fastify'
import cors from '@fastify/cors'
import formbodyPlugin from '@fastify/formbody'
import { Effect } from 'effect'
import Fastify from 'fastify'

import { Env } from '@aipacto/shared-utils-env'
import { logAppServer } from '@aipacto/shared-utils-logging'
import { routesAgents } from './routes/agents'
import { routesThreads } from './routes/threads'

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
		trustProxy: true,
	}

	const server = Fastify(serverOptions)

	// Register formbody plugin to parse form data (required by Clerk)
	logAppServer.info('Registering Formbody plugin')
	server.register(formbodyPlugin)

	// Register CORS
	logAppServer.info('Registering CORS plugin')
	server.register(cors, {
		origin: (origin, callback) => {
			// Allow all origins in development
			if (process.env.NODE_ENV === 'development') {
				callback(null, true)
				return
			}

			// In production, check against allowed origins
			const allowedOrigins =
				process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || []
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true)
			} else {
				callback(new Error('CORS origin not allowed'), false)
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86400, // 24 hours
		preflight: true,
		strictPreflight: true,
	})

	// Register authentication
	logAppServer.info('Registering Clerk plugin')
	server.register(clerkPlugin)

	logAppServer.info('Setting error handler')
	server.setErrorHandler((err, request, reply) => {
		if (!reply.sent) {
			reply.status(500).send({ error: 'Internal Server Error' })
		}
	})

	// Register routes
	logAppServer.info('Registering routes')
	await routesAgents(server)
	await routesThreads(server)

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
