import type { FastifyInstance } from 'fastify'

import type { CodeAgent } from './code_agent.js'
import type { FileManager } from './file_manager.js'
import { createBrowserPod, deletePod } from './k8s_manager.js'

export function registerRoutes(
	fastify: FastifyInstance,
	codeAgent: CodeAgent,
	fileManager: FileManager,
) {
	// 1) Create a new file
	fastify.post('/files', async (request, reply) => {
		const { filename, language, librarySet } = request.body as {
			filename: string
			language: 'python' | 'typescript'
			librarySet?: string
		}
		try {
			const fileId = fileManager.createFile(filename, language, librarySet)
			reply.send({ fileId })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	// 2) Add new version to an existing file
	fastify.post('/files/:fileId/versions', async (request, reply) => {
		const { fileId } = request.params as { fileId: string }
		const { content } = request.body as { content: string }
		try {
			const versionId = fileManager.addVersion(fileId, content)
			reply.send({ versionId })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	// 3) Run code (auto-fix included)
	fastify.post('/files/:fileId/run', async (request, reply) => {
		const { fileId } = request.params as { fileId: string }
		const { taskComplexity } = request.body as {
			taskComplexity?: 'light' | 'medium' | 'heavy'
		}
		try {
			const result = await codeAgent.runCode(fileId, taskComplexity)
			reply.send(result)
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	// 4) Host code as ephemeral web app
	fastify.post('/files/:fileId/host', async (request, reply) => {
		const { fileId } = request.params as { fileId: string }
		const { port, taskComplexity } = request.body as {
			port?: number
			taskComplexity?: 'light' | 'medium' | 'heavy'
		}
		try {
			const p = port ?? 3000
			const { podName, serviceName } = await codeAgent.hostCode(
				fileId,
				p,
				taskComplexity ?? 'medium',
			)
			reply.send({ podName, serviceName })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	// 5) Stop hosting
	fastify.delete('/host/:podName/:serviceName', async (request, reply) => {
		const { podName, serviceName } = request.params as {
			podName: string
			serviceName: string
		}
		try {
			await codeAgent.stopHosting(podName, serviceName)
			reply.send({ success: true })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	// 6) Create a sandboxed browser Pod
	fastify.post('/browser', async (request, reply) => {
		const { taskComplexity } = request.body as {
			taskComplexity?: 'light' | 'medium' | 'heavy'
		}
		try {
			const settings = codeAgent['llm'] // Not relevant, we need ResourceManager
			// We can do a direct approach or integrate ResourceManager:
			// e.g. let resourceSettings = ResourceManager.getPodSettingsForTask(taskComplexity ?? 'light')
			const resourceSettings = {
				runtimeClass: 'kata',
				cpuLimit: '500m',
				memoryLimit: '512Mi',
				timeQuotaSeconds: 60,
			}
			const podName = await createBrowserPod(resourceSettings)
			reply.send({ podName })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})

	fastify.delete('/browser/:podName', async (request, reply) => {
		const { podName } = request.params as { podName: string }
		try {
			await deletePod(podName)
			reply.send({ success: true })
		} catch (err) {
			reply
				.status(500)
				.send({ error: err instanceof Error ? err.message : 'Unknown error' })
		}
	})
}
