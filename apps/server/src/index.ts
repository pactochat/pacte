import Fastify from 'fastify'

import { CodeAgent } from './codeAgent'
import { FileManager } from './fileManager'
import { registerRoutes } from './routes.'

async function startServer() {
	const fastify = Fastify({ logger: true })

	// Initialize our in-memory file store and code agent
	const fileManager = new FileManager()
	const codeAgent = new CodeAgent(fileManager)

	// Register routes
	registerRoutes(fastify, codeAgent, fileManager)

	// Start server
	const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000
	try {
		await fastify.listen({ port, host: '0.0.0.0' })
		console.log(`Fastify server is running on port ${port}`)
	} catch (err) {
		fastify.log.error(err)
		process.exit(1)
	}
}

startServer()
