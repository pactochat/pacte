import cors from '@fastify/cors'
import fp from 'fastify-plugin'
import { getAllCORSHeaders } from 'supertokens-node'

import { logAppServer } from '@pacto-chat/shared-utils-logging'

const log = logAppServer.getChildCategory('cors')

export const corsPlugin = fp(fastify => {
	const allowedOrigins = [
		process.env.DASHBOARD_URL,
		process.env.SERVER_URL,
		process.env.WEBSITE_URL,
	].filter(Boolean)

	fastify.register(cors, {
		origin: (origin, cb) => {
			try {
				const originUrl = origin ? new URL(origin) : undefined

				// Allow if origin is undefined (e.g., same-origin) or matches allowed origins
				if (!originUrl || allowedOrigins.includes(origin)) {
					cb(null, true)
					return
				}

				log.warn('Blocked CORS request from unauthorized origin', {
					origin,
					allowedOrigins: Array.from(allowedOrigins),
				})
				cb(new Error('Origin not allowed'), false)
			} catch (err) {
				log.error('Invalid origin in CORS request', {
					origin,
					error: err,
				})
				cb(new Error('Invalid origin format'), false)
			}
		},
		allowedHeaders: ['Content-Type', ...getAllCORSHeaders()],
		credentials: true,
	})

	// Add a preHandler hook to enforce HTTPS
	fastify.addHook('preHandler', (request, reply, done) => {
		const isProxiedHttps = request.headers['x-forwarded-proto'] === 'https'
		const origin = request.headers.origin

		if (origin) {
			const originUrl = new URL(origin)
			if (originUrl.protocol !== 'https:' && !isProxiedHttps) {
				reply.code(403).send({ error: 'Only HTTPS origins are allowed' })
				return
			}
		}
		done()
	})
})
