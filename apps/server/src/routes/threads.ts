import { getAuth } from '@clerk/fastify'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import {
	type ConversationMessage,
	supervisorAgentGraph,
} from '@aipacto/agents-infra-langchain'
import { logAppServer } from '@aipacto/shared-utils-logging'

// In-memory store for threads
// TODO: Replace with persistent database in production
const threadStore = new Map<string, Array<ConversationMessage>>()

/**
 * Interface for thread-related requests
 */
interface ThreadRequestBody {
	threadId?: string
	text?: string
	language?: string
	additionalContext?: Record<string, unknown>
}

interface ThreadMessageRequestBody {
	text: string
	language?: string
	additionalContext?: Record<string, unknown>
}

/**
 * Registers thread-related routes with authentication
 */
export async function routesThreads(fastify: FastifyInstance) {
	// Global authentication for all thread routes
	fastify.addHook('preHandler', async (request, reply) => {
		const { userId } = getAuth(request)
		if (!userId) {
			reply.status(401).send({ error: 'Unauthorized' })
		}
	})

	// Create a new thread or get an existing one
	fastify.post(
		'/threads',
		async (
			request: FastifyRequest<{ Body: ThreadRequestBody }>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { threadId } = request.body || {}

				// Generate a thread ID if not provided
				const actualThreadId = threadId || `thread-${userId}-${Date.now()}`

				// Initialize thread if it doesn't exist
				if (!threadStore.has(actualThreadId)) {
					threadStore.set(actualThreadId, [])
				}

				logAppServer.info('Thread accessed', {
					threadId: actualThreadId,
					userId,
				})

				// Return the thread
				return reply.status(200).send({
					threadId: actualThreadId,
					messages: threadStore.get(actualThreadId),
				})
			} catch (error) {
				logAppServer.error(
					'Error accessing thread:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error accessing thread',
					message: (error as Error).message,
				})
			}
		},
	)

	// Get a specific thread by ID
	fastify.get(
		'/threads/:threadId',
		async (
			request: FastifyRequest<{ Params: { threadId: string } }>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { threadId } = request.params

				// Check if thread exists
				if (!threadStore.has(threadId)) {
					return reply.status(404).send({ error: 'Thread not found' })
				}

				logAppServer.info('Thread retrieved', { threadId, userId })

				// Return the thread
				return reply.status(200).send({
					threadId,
					messages: threadStore.get(threadId),
				})
			} catch (error) {
				logAppServer.error(
					'Error retrieving thread:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error retrieving thread',
					message: (error as Error).message,
				})
			}
		},
	)

	// Add a message to a thread (non-streaming)
	fastify.post(
		'/threads/:threadId/messages',
		async (
			request: FastifyRequest<{
				Params: { threadId: string }
				Body: ThreadMessageRequestBody
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { threadId } = request.params
				const { text, language, additionalContext } = request.body

				// Check if thread exists
				if (!threadStore.has(threadId)) {
					threadStore.set(threadId, [])
				}

				// Get thread messages
				const messages = threadStore.get(threadId)
				if (!messages) {
					throw new Error('Failed to retrieve thread messages')
				}

				// Add user message to thread
				messages.push({ role: 'user', content: text })

				logAppServer.info('Processing thread message', {
					threadId,
					userId,
					textPreview: text.substring(0, 50),
				})

				// Convert messages to LangChain format
				const langchainMessages = messages.map(msg => {
					if (msg.role === 'user') return new HumanMessage(msg.content)

					if (msg.role === 'assistant') return new AIMessage(msg.content)

					// System messages would be handled here
					return new HumanMessage(msg.content)
				})

				// Create the initial state for the supervisor agent
				const initialState = {
					messages: langchainMessages,
					context: {
						question: text,
						language,
						additionalContext: {
							...additionalContext,
							userId,
							threadId,
							conversationHistory: messages,
						},
					},
				}

				// Invoke the supervisor agent
				const result = await supervisorAgentGraph.invoke(initialState)

				if (result.error) {
					throw new Error(result.error)
				}

				// Extract the assistant's response
				let assistantResponse = ''
				if (result.messages && result.messages.length > 0) {
					const lastMessage = result.messages[result.messages.length - 1]
					assistantResponse =
						typeof lastMessage.content === 'string'
							? lastMessage.content
							: JSON.stringify(lastMessage.content)
				} else if (result.summarizer) {
					assistantResponse = result.summarizer.text
				} else if (result.impact) {
					assistantResponse = result.impact.text
				} else if (result.simplifier) {
					assistantResponse = result.simplifier.text
				} else if (result.planner) {
					assistantResponse = result.planner.text
				} else {
					assistantResponse =
						"I processed your request, but couldn't generate a specific response."
				}

				// Add assistant message to thread
				messages.push({ role: 'assistant', content: assistantResponse })

				// Return the result along with updated thread
				return reply.status(200).send({
					threadId,
					messages,
					result,
				})
			} catch (error) {
				logAppServer.error(
					'Error processing thread message:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error processing thread message',
					message: (error as Error).message,
				})
			}
		},
	)

	// Add a message to a thread (streaming)
	fastify.post(
		'/threads/:threadId/messages/stream',
		async (
			request: FastifyRequest<{
				Params: { threadId: string }
				Body: ThreadMessageRequestBody
			}>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { threadId } = request.params
				const { text, language, additionalContext } = request.body

				// Check if thread exists
				if (!threadStore.has(threadId)) {
					threadStore.set(threadId, [])
				}

				// Get thread messages
				const messages = threadStore.get(threadId)
				if (!messages) {
					throw new Error('Failed to retrieve thread messages')
				}

				// Add user message to thread
				messages.push({ role: 'user', content: text })

				logAppServer.info('Streaming thread message processing', {
					threadId,
					userId,
					textPreview: text.substring(0, 50),
				})

				// Convert messages to LangChain format
				const langchainMessages = messages.map(msg => {
					if (msg.role === 'user') return new HumanMessage(msg.content)

					if (msg.role === 'assistant') return new AIMessage(msg.content)

					// System messages would be handled here
					return new HumanMessage(msg.content)
				})

				// Create the initial state for the supervisor agent
				const initialState = {
					messages: langchainMessages,
					context: {
						question: text,
						language,
						additionalContext: {
							...additionalContext,
							userId,
							threadId,
							conversationHistory: messages,
						},
					},
				}

				// Set up streaming response
				reply.raw.setHeader('Content-Type', 'text/event-stream')
				reply.raw.setHeader('Cache-Control', 'no-cache')
				reply.raw.setHeader('Connection', 'keep-alive')
				reply.raw.setHeader('Transfer-Encoding', 'chunked')

				// Stream the supervisor agent execution
				let finalResponse = null

				// Stream the supervisor agent execution
				for await (const chunk of await supervisorAgentGraph.stream(
					initialState,
				)) {
					// Process each chunk for streaming
					const processedChunk = processStreamChunk(chunk)

					if (processedChunk) {
						// Check if this is the final response
						if (processedChunk.final && processedChunk.response) {
							finalResponse = processedChunk.response
						}

						// Add threadId to the chunk
						const enrichedChunk = { ...processedChunk, threadId }

						// Stream the chunk
						const data = JSON.stringify(enrichedChunk)
						reply.raw.write(`data: ${data}\n\n`)

						// Break on error
						if (processedChunk.step === 'error') {
							break
						}
					}
				}

				// Add assistant message to thread if we got a final response
				if (finalResponse) {
					messages.push({ role: 'assistant', content: finalResponse })
				}

				// End the response
				reply.raw.end()
				return reply
			} catch (error) {
				logAppServer.error(
					'Error in thread message streaming:',
					(error as Error).toString(),
				)

				// Send error as stream event
				const errorData = JSON.stringify({
					step: 'error',
					data: { error: (error as Error).message || 'Unknown error' },
					threadId: request.params.threadId,
				})
				reply.raw.write(`data: ${errorData}\n\n`)
				reply.raw.end()
				return reply
			}
		},
	)

	// Delete a thread
	fastify.delete(
		'/threads/:threadId',
		async (
			request: FastifyRequest<{ Params: { threadId: string } }>,
			reply: FastifyReply,
		) => {
			try {
				const { userId } = getAuth(request)
				if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

				const { threadId } = request.params

				// Check if thread exists
				if (!threadStore.has(threadId)) {
					return reply.status(404).send({ error: 'Thread not found' })
				}

				// Delete the thread
				threadStore.delete(threadId)

				logAppServer.info('Thread deleted', { threadId, userId })

				return reply.status(200).send({
					success: true,
					message: 'Thread deleted successfully',
				})
			} catch (error) {
				logAppServer.error(
					'Error deleting thread:',
					(error as Error).toString(),
				)
				return reply.status(500).send({
					error: 'Error deleting thread',
					message: (error as Error).message,
				})
			}
		},
	)
}

/**
 * Process stream chunks to make them frontend-friendly
 */
function processStreamChunk(chunk: Record<string, any>) {
	// Filter out empty chunks
	if (!chunk || Object.keys(chunk).length === 0) {
		return null
	}

	const stepNames = Object.keys(chunk)
	if (stepNames.length === 0) {
		return null
	}

	const stepName = stepNames[0]
	const stepData = stepName ? chunk[stepName] : null

	// Skip internal steps that aren't relevant to the frontend
	if (stepName === 'messages' || !stepData) {
		return null
	}

	// Handle final response based on agent type
	let finalResponse = null
	let isFinal = false

	if (
		stepName === 'output' ||
		stepName === 'summarizer' ||
		stepName === 'impact' ||
		stepName === 'simplifier' ||
		stepName === 'planner'
	) {
		isFinal = true
		finalResponse =
			stepData.text ||
			(typeof stepData === 'string' ? stepData : JSON.stringify(stepData))
	}

	// Format the chunk for frontend consumption
	return {
		step: stepName,
		data: stepData,
		final: isFinal,
		response: finalResponse,
	}
}
