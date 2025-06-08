import { getAuth } from '@clerk/fastify'
import { AIMessage, HumanMessage } from '@langchain/core/messages'

import {
	impactAgentGraph,
	plannerAgentGraph,
	simplifierAgentGraph,
	summarizerAgentGraph,
	supervisorAgentGraph,
} from '@aipacto/agents-infra-langchain'
import { logAppServer } from '@aipacto/shared-utils-logging'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { detectLanguage } from '../utils/language-detection'

/**
 * Common interface for agent requests
 */
interface AgentRequestBody {
	text: string
	language?: string
	threadId?: string // Optional thread ID for thread-based agents
	additionalContext?: Record<string, unknown>
}

/**
 * Registers individual agent routes with authentication
 */
export async function routesAgents(fastify: FastifyInstance) {
	// Global authentication for all agent routes
	fastify.addHook('preHandler', async (request, reply) => {
		const { userId } = getAuth(request)
		if (!userId) {
			reply.status(401).send({ error: 'Unauthorized' })
		}
	})

	/**
	 * Shared handler for non-streaming agent requests
	 */
	async function handleAgentRequest(
		request: FastifyRequest<{ Body: AgentRequestBody }>,
		reply: FastifyReply,
		agentName: string,
		agentGraph: any,
	) {
		try {
			const { userId } = getAuth(request)
			if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

			const { text, language, additionalContext, threadId } = request.body

			// Detect language if not provided
			const detectedLanguage = language || (await detectLanguage(text))

			// Create the messages
			const messages = [new HumanMessage(text)]

			// Create the initial state for the agent
			const initialState = {
				messages,
				context: {
					question: text,
					language: detectedLanguage,
					additionalContext: {
						...additionalContext,
						userId,
						threadId,
					},
				},
			}

			logAppServer.info(`Processing ${agentName} request`, {
				textPreview: text.substring(0, 50),
				language: detectedLanguage,
				userId,
				threadId,
			})

			// Invoke the agent
			const result = await agentGraph.invoke(initialState)

			if (result.error) {
				throw new Error(result.error)
			}

			// Return the result
			return reply.status(200).send(result)
		} catch (error) {
			logAppServer.error(
				`Error in ${agentName} agent:`,
				(error as Error).toString(),
			)
			return reply.status(500).send({
				error: `Error processing ${agentName} request`,
				message: (error as Error).message,
			})
		}
	}

	/**
	 * Shared handler for streaming agent requests
	 */
	async function handleStreamingAgentRequest(
		request: FastifyRequest<{ Body: AgentRequestBody }>,
		reply: FastifyReply,
		agentName: string,
		agentGraph: any,
	) {
		try {
			const { userId } = getAuth(request)
			if (!userId) return reply.status(401).send({ error: 'Unauthorized' })

			const { text, language, additionalContext, threadId } = request.body

			// Detect language if not provided
			const detectedLanguage = language || (await detectLanguage(text))

			// Create the messages
			const messages = [new HumanMessage(text)]

			// Create the initial state for the agent
			const initialState = {
				messages,
				context: {
					question: text,
					language: detectedLanguage,
					additionalContext: {
						...additionalContext,
						userId,
						threadId,
					},
				},
			}

			logAppServer.info(`Streaming ${agentName} request`, {
				textPreview: text.substring(0, 50),
				language: detectedLanguage,
				userId,
				threadId,
			})

			// Set up streaming response
			reply.raw.setHeader('Content-Type', 'text/event-stream')
			reply.raw.setHeader('Cache-Control', 'no-cache')
			reply.raw.setHeader('Connection', 'keep-alive')
			reply.raw.setHeader('Transfer-Encoding', 'chunked')

			// Stream the agent execution
			let finalResponse = null

			for await (const chunk of await agentGraph.stream(initialState)) {
				// Process each chunk for streaming
				const processedChunk = processStreamChunk(chunk, agentName)

				if (processedChunk) {
					// Check if this is the final response
					if (processedChunk.final && processedChunk.response) {
						finalResponse = processedChunk.response
					}

					// Augment with threadId if provided
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

			// Update thread if threadId was provided
			if (threadId && finalResponse) {
				// This would typically call a thread service to update the thread
				// Left as a placeholder for the threads implementation
			}

			// End the response
			reply.raw.end()
			return reply
		} catch (error) {
			logAppServer.error(
				`Error in streaming ${agentName}:`,
				(error as Error).toString(),
			)

			// Send error as stream event
			const errorData = JSON.stringify({
				step: 'error',
				data: { error: (error as Error).message || 'Unknown error' },
			})
			reply.raw.write(`data: ${errorData}\n\n`)
			reply.raw.end()
			return reply
		}
	}

	/**
	 * Process stream chunks to make them frontend-friendly
	 */
	function processStreamChunk(chunk: Record<string, any>, agentName: string) {
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

		// Format the chunk for frontend consumption
		return {
			agent: agentName,
			step: stepName,
			data: stepData,
			// If the step has completed, also include final response
			final: stepName === 'output' || stepName === agentName,
			response:
				stepName === 'output' || stepName === agentName
					? stepData.text || stepData.content || JSON.stringify(stepData)
					: undefined,
		}
	}

	// --- Register agent-specific routes ---

	// Supervisor agent (general routing to appropriate agent)
	fastify.post(
		'/agents/supervisor',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleAgentRequest(
				request,
				reply,
				'supervisor',
				supervisorAgentGraph,
			)
		},
	)

	fastify.post(
		'/agents/supervisor/stream',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleStreamingAgentRequest(
				request,
				reply,
				'supervisor',
				supervisorAgentGraph,
			)
		},
	)

	// Impact agent
	fastify.post(
		'/agents/impact',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleAgentRequest(request, reply, 'impact', impactAgentGraph)
		},
	)

	fastify.post(
		'/agents/impact/stream',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleStreamingAgentRequest(
				request,
				reply,
				'impact',
				impactAgentGraph,
			)
		},
	)

	// Planner agent
	fastify.post(
		'/agents/planner',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleAgentRequest(request, reply, 'planner', plannerAgentGraph)
		},
	)

	fastify.post(
		'/agents/planner/stream',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleStreamingAgentRequest(
				request,
				reply,
				'planner',
				plannerAgentGraph,
			)
		},
	)

	// Simplifier agent
	fastify.post(
		'/agents/simplifier',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleAgentRequest(
				request,
				reply,
				'simplifier',
				simplifierAgentGraph,
			)
		},
	)

	fastify.post(
		'/agents/simplifier/stream',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleStreamingAgentRequest(
				request,
				reply,
				'simplifier',
				simplifierAgentGraph,
			)
		},
	)

	// Summarizer agent
	fastify.post(
		'/agents/summarizer',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleAgentRequest(
				request,
				reply,
				'summarizer',
				summarizerAgentGraph,
			)
		},
	)

	fastify.post(
		'/agents/summarizer/stream',
		async (request: FastifyRequest<{ Body: AgentRequestBody }>, reply) => {
			return handleStreamingAgentRequest(
				request,
				reply,
				'summarizer',
				summarizerAgentGraph,
			)
		},
	)
}
