import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

import { detectLanguage } from '../../../tools/language_detector'
import type { SupervisorState, SupervisorUpdate } from '../types'

// List of available agents for routing
const AVAILABLE_AGENTS = `
- summarizer: Summarizes text content, extracting key points from documents
- impact: Analyzes the impact of text on different dimensions (social, economic, etc.)
- simplifier: Simplifies complex text to make it more accessible
- planner: Creates action plans based on the content
- general: Handles general queries that don't fit other categories
`

/**
 * Router node that determines which agent should handle the request
 */
export async function router(
	state: SupervisorState,
): Promise<Partial<SupervisorUpdate>> {
	try {
		logAgentsInfraLangchain.debug('[Supervisor.router] Routing request')

		// Get the user's query from the last message or context
		const lastMessage = state.messages[state.messages.length - 1]
		const userQuery =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: state.context?.question

		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Supervisor.router] Missing question in input',
			)
			return {
				error: 'Question is missing',
				next: 'general',
			}
		}

		// Save the query to context if not already there
		const contextUpdate = !state.context?.question
			? { context: { question: userQuery } }
			: {}

		// Detect language if not already provided
		const language =
			state.languageDetected ||
			state.context?.language ||
			(await detectLanguage(userQuery))

		// Define the router schema
		const routerSchema = z.object({
			route: z
				.enum(['summarizer', 'impact', 'simplifier', 'planner', 'general'])
				.describe('The agent to route the request to based on the user query'),
		})

		// Create the router tool
		const routerTool = {
			name: 'router',
			description: 'Routes the user query to the appropriate agent',
			schema: routerSchema,
		}

		// Set up the LLM with the router tool
		const llm = new ChatOpenAI({
			model: 'gpt-4o',
			temperature: 0,
		}).bindTools([routerTool], { tool_choice: 'router' })

		// Create the prompt
		const systemPrompt = `You are a routing agent that determines which specialized agent should handle a user query.
Available agents:
${AVAILABLE_AGENTS}

Your job is to analyze the user's query and route it to the most appropriate agent.
If the query doesn't clearly match any specialized agent, route to 'general'.`

		// Call the LLM to determine the route
		const response = await llm.invoke([
			new SystemMessage(systemPrompt),
			new HumanMessage(userQuery),
		])

		// Extract the route from the tool call
		const toolCall = response.tool_calls?.[0]?.args as
			| z.infer<typeof routerSchema>
			| undefined

		if (!toolCall) {
			logAgentsInfraLangchain.warn(
				'[Supervisor.router] No valid route returned by LLM',
			)
			return {
				error: 'Failed to determine appropriate agent',
				next: 'general',
				languageDetected: language,
				...contextUpdate,
			}
		}

		logAgentsInfraLangchain.debug(
			`[Supervisor.router] Routing to ${toolCall.route}`,
			{ language },
		)

		// Return the determined route
		return {
			next: toolCall.route,
			languageDetected: language,
			error: null,
			...contextUpdate,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Supervisor.router] Error determining route',
			{ error },
		)
		return {
			error: error instanceof Error ? error.message : 'Unknown routing error',
			next: 'general',
		}
	}
}
