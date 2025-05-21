import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import type { SupervisorState, SupervisorUpdate } from '../types'

// List of available agents for routing
const AGENT_NAMES = [
	'summarizer',
	'simplifier',
	'general',
	// Add more agent names here as needed
]
const options = [END, ...AGENT_NAMES]

const AVAILABLE_AGENTS = `
- summarizer: Summarizes text content, extracting key points from documents
- simplifier: Simplifies complex text to make it more accessible
- general: Handles general queries that don't fit other categories
`

/**
 * Supervisor node that determines which agent should handle the request next
 */
export async function supervisorNode(
	state: SupervisorState,
): Promise<Partial<SupervisorUpdate>> {
	try {
		logAgentsInfraLangchain.debug(
			'[Supervisor.supervisorNode] Deciding next agent',
		)

		// Define the routing schema
		const routingSchema = z.object({
			next: z.enum(options),
		})

		const routingTool = {
			name: 'route',
			description: 'Select the next agent to act.',
			schema: routingSchema,
		}

		const systemPrompt = `You are a supervisor managing these agents: {members}.
Given the conversation so far, select the next agent to act, or FINISH (${END}).
Available agents:
${AVAILABLE_AGENTS}`

		const llm = new ChatOpenAI({ model: 'gpt-4o', temperature: 0 })
		const response = await llm
			.bindTools([routingTool], { tool_choice: 'route' })
			.invoke([
				new SystemMessage(
					systemPrompt.replace('{members}', AGENT_NAMES.join(', ')),
				),
				...state.messages,
				new HumanMessage(
					`Given the conversation above, who should act next? Or should we FINISH? Select one of: ${options.join(', ')}`,
				),
			])

		const toolCall = response.tool_calls?.[0]?.args as
			| { next: string }
			| undefined
		if (!toolCall) {
			logAgentsInfraLangchain.warn(
				'[Supervisor.supervisorNode] No valid route returned by LLM',
			)
			return { error: 'Failed to determine next agent', next: END }
		}

		logAgentsInfraLangchain.debug(
			`[Supervisor.supervisorNode] Routing to ${toolCall.next}`,
		)
		return { next: toolCall.next, error: null }
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Supervisor.supervisorNode] Error determining next agent',
			{ error },
		)
		return {
			error: error instanceof Error ? error.message : 'Unknown routing error',
			next: END,
		}
	}
}
