import { getAuth } from '@clerk/fastify'
import {
	type ConversationMessage,
	createAgentInput,
	processText,
	streamWorkflow,
} from '@pacto-chat/agents-infra-langgraph'
import { logAppServer } from '@pacto-chat/shared-utils-logging'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

// In-memory store for conversation history
// TODO: Replace with persistent database in production
const conversationStore = new Map<string, Array<ConversationMessage>>()

/**
 * Registers conversation-related routes with authentication using Clerk.
 */
export async function routesConversations(fastify: FastifyInstance) {
	// --- Global authentication preHandler for all conversation routes ---
	fastify.addHook('preHandler', async (request, reply) => {
		const { userId } = getAuth(request)
		if (!userId) {
			reply.status(401).send({ error: 'Unauthorized' })
		}
	})

	// --- Create or get a conversation ---
	fastify.post(
		'/conversations',
		async (
			request: FastifyRequest<{ Body: { conversationId?: string } }>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { conversationId } = request.body || {}
				// Generate a conversation ID if not provided
				const actualConversationId = conversationId || `${userId}-${Date.now()}`

				// Initialize conversation if it doesn't exist
				if (!conversationStore.has(actualConversationId)) {
					conversationStore.set(actualConversationId, [])
				}

				return reply.status(200).send({
					conversationId: actualConversationId,
					history: conversationStore.get(actualConversationId),
				})
			} catch (error) {
				logAppServer.error(
					'Error accessing conversation:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error accessing conversation',
					message: (error as Error).message,
				})
			}
		},
	)

	// --- Get conversation history ---
	fastify.get(
		'/conversations/:conversationId',
		async (
			request: FastifyRequest<{ Params: { conversationId: string } }>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { conversationId } = request.params
				if (!conversationStore.has(conversationId)) {
					return reply.status(404).send({ error: 'Conversation not found' })
				}

				return reply.status(200).send({
					conversationId,
					history: conversationStore.get(conversationId),
				})
			} catch (error) {
				logAppServer.error(
					'Error retrieving conversation history:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error retrieving conversation history',
					message: (error as Error).message,
				})
			}
		},
	)

	// --- Process text with agents (non-streaming) ---
	fastify.post(
		'/conversations/process',
		async (
			request: FastifyRequest<{
				Body: { text: string; language?: string; conversationId?: string }
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { text, language, conversationId } = request.body
				logAppServer.info(`Processing text: ${text.substring(0, 50)}...`)

				// Retrieve or initialize conversation history
				let history: ConversationMessage[] = []
				if (conversationId) {
					if (!conversationStore.has(conversationId)) {
						conversationStore.set(conversationId, [])
					}
					const existingHistory = conversationStore.get(conversationId)
					if (!existingHistory) {
						throw new Error('Failed to retrieve conversation history')
					}
					history = existingHistory
					// Add the user message to history
					history.push({ role: 'user', content: text })
				}

				// Create agent input and process the text
				const input = createAgentInput(text, language as any)
				const result = await processText(
					input,
					history.length > 0 ? history : undefined,
				)

				// Update conversation history with assistant's response
				if (conversationId) {
					history.push({ role: 'assistant', content: result.text })
				}

				return reply.status(200).send({ ...result, conversationId })
			} catch (error) {
				logAppServer.error(
					'Error processing LangChain text:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error processing text',
					message: (error as Error).message,
				})
			}
		},
	)

	// --- Process text with agents (streaming, Server-Sent Events) ---
	fastify.post(
		'/conversations/stream',
		async (
			request: FastifyRequest<{
				Body: { text: string; language?: string; conversationId?: string }
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { text, language, conversationId } = request.body
				logAppServer.info(
					`Streaming text processing: ${text.substring(0, 50)}...`,
				)

				// Retrieve or initialize conversation history
				let history: ConversationMessage[] = []
				if (conversationId) {
					if (!conversationStore.has(conversationId)) {
						conversationStore.set(conversationId, [])
					}
					const existingHistory = conversationStore.get(conversationId)
					if (!existingHistory) {
						throw new Error('Failed to retrieve conversation history')
					}
					history = existingHistory
					// Add the user message to history
					history.push({ role: 'user', content: text })
				}

				// Set up streaming response headers
				reply.raw.setHeader('Content-Type', 'text/event-stream')
				reply.raw.setHeader('Cache-Control', 'no-cache')
				reply.raw.setHeader('Connection', 'keep-alive')
				reply.raw.setHeader('Transfer-Encoding', 'chunked')

				// Create agent input and stream the workflow
				const input = createAgentInput(text, language as any)
				const stream = streamWorkflow(
					input,
					history.length > 0 ? history : undefined,
				)
				let finalResponse: string | null = null

				// Stream results back to the client
				for await (const chunk of stream) {
					if (chunk.final && chunk.response) {
						finalResponse = chunk.response
					}
					const enrichedChunk = { ...chunk, conversationId }
					const data = JSON.stringify(enrichedChunk)
					reply.raw.write(`data: ${data}\n\n`)
					if (chunk.step === 'error') {
						break
					}
				}

				// Update conversation history with assistant's response
				if (conversationId && finalResponse) {
					history.push({ role: 'assistant', content: finalResponse })
				}

				// End the response
				reply.raw.end()
				return reply
			} catch (error) {
				logAppServer.error(
					'Error in LangChain stream:',
					(error as Error).toString(),
				)
				const errorData = JSON.stringify({
					step: 'error',
					data: { error: (error as Error).message || 'Unknown error' },
				})
				reply.raw.write(`data: ${errorData}\n\n`)
				reply.raw.end()
				return reply
			}
		},
	)
}
