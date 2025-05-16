import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type {
	AgentType,
	RouterInput,
	RouterOutput,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../state'
import { logAgentExecution } from './utils'

/**
 * Implementation of the router node for LangGraph
 */
export async function routerNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('router', 'started')

		// Get input from state
		const input = state.input as RouterInput
		const availableAgents = input.availableAgents || [
			'rephraser',
			'simplifier',
			'summarizer',
			'impact',
			'planner',
			'legalGap',
		]
		const isSequential = input.isSequential ?? false

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert AI agent router. Based on the text content, determine which AI agent(s) would be most appropriate to process it.
      
      Available agents:
      {agentDescriptions}
      
      Routing type: {routingType}
      
      For each agent, consider:
      1. How well the content matches the agent's purpose
      2. The potential value the agent could provide
      3. Whether the request explicitly asks for this type of processing
      
      If routing sequentially, order the agents in the most logical processing sequence.
      
      Text to analyze:
      {text}
      
      For your response, provide:
      1. The selected agent(s)
      2. A brief explanation of your decision
      3. Your confidence level (0-1)
      4. Alternative agents that could also be appropriate
    `)

		// Create descriptions for each agent
		const agentDescriptions = getAgentDescriptions(availableAgents)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Route the following text to appropriate agent(s): "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			text: input.text,
			agentDescriptions,
			routingType: isSequential
				? 'Sequential (multiple agents in order)'
				: 'Single (one best agent)',
		})

		// Add response to messages
		messages.push(response)

		// Parse agent routing from the response
		const routingResult = await parseRoutingResult(
			response.content as string,
			availableAgents,
			isSequential,
			model,
		)

		// Create the output
		const output: RouterOutput = {
			text: routingResult.explanation,
			nextAgent: routingResult.selectedAgents,
			routingReason: routingResult.explanation,
			confidence: routingResult.confidence,
			alternativeAgents: routingResult.alternativeAgents,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		// Log completion
		const completeLog = logAgentExecution('router', 'completed')

		// Update the currentAgent in state
		const currentAgent = Array.isArray(routingResult.selectedAgents)
			? routingResult.selectedAgents[0]
			: routingResult.selectedAgents

		// Return updated state
		return {
			output,
			agentOutputs: { router: output },
			currentAgent,
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('router', 'failed')

		// Return error state
		return {
			error: `Error in router: ${error}`,
			executionLog: [errorLog],
		}
	}
}

/**
 * Create descriptions for each agent type
 */
function getAgentDescriptions(agents: AgentType[]): string {
	const descriptions: Record<AgentType, string> = {
		rephraser:
			'Rewrites text in different styles and tones while preserving the original meaning',
		simplifier:
			'Reduces the complexity of text to make it more accessible to different audiences',
		summarizer:
			'Creates concise summaries of longer text while preserving key information',
		impact:
			'Assesses the potential social, financial, environmental, legal, ethical, political or technological impact of proposals or statements',
		planner:
			'Creates step-by-step plans to achieve goals described in the text',
		legalGap:
			'Identifies potential legal compliance issues or gaps in legal documents or proposals',
	}

	return agents.map(agent => `- ${agent}: ${descriptions[agent]}`).join('\n')
}

/**
 * Parse routing result from LLM response
 */
async function parseRoutingResult(
	content: string,
	availableAgents: AgentType[],
	isSequential: boolean,
	model: ChatOpenAI,
): Promise<{
	selectedAgents: AgentType | AgentType[]
	explanation: string
	confidence: number
	alternativeAgents: AgentType[]
}> {
	// In a production system, use a structured output parser
	const prompt = ChatPromptTemplate.fromTemplate(`
    Parse the following agent routing decision.
    Extract:
    1. Selected agent(s)
    2. Explanation of the decision
    3. Confidence level (0-1)
    4. Alternative agents
    
    Available agents: ${availableAgents.join(', ')}
    Sequential routing: ${isSequential ? 'true' : 'false'}
    
    Decision content:
    {content}
    
    Output in a structured JSON format with these fields.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = response.content || ''
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// Validate selected agents
		let selectedAgents: AgentType | AgentType[]

		if (isSequential) {
			// For sequential routing, ensure we have an array of valid agents
			if (Array.isArray(parsed.selectedAgents)) {
				selectedAgents = parsed.selectedAgents.filter((agent: string) =>
					availableAgents.includes(agent as AgentType),
				) as AgentType[]
			} else if (typeof parsed.selectedAgents === 'string') {
				// If a single agent was returned, try to parse a comma-separated list
				selectedAgents = parsed.selectedAgents
					.split(/,\s*/)
					.filter((agent: string) =>
						availableAgents.includes(agent as AgentType),
					) as AgentType[]
			} else {
				selectedAgents = [availableAgents[0]] // Fallback to first available agent
			}

			// Ensure we have at least one agent
			if (selectedAgents.length === 0) {
				selectedAgents = [availableAgents[0]]
			}
		} else {
			// For single routing, ensure we have exactly one valid agent
			if (
				Array.isArray(parsed.selectedAgents) &&
				parsed.selectedAgents.length > 0
			) {
				selectedAgents = parsed.selectedAgents[0] as AgentType
			} else if (typeof parsed.selectedAgents === 'string') {
				// If we got a string, check if it's a valid agent name
				const agent = parsed.selectedAgents.trim().split(/\s+/)[0].toLowerCase()
				selectedAgents = availableAgents.includes(agent as AgentType)
					? (agent as AgentType)
					: availableAgents[0]
			} else {
				selectedAgents = availableAgents[0] // Fallback to first available agent
			}
		}

		// Validate alternative agents
		let alternativeAgents: AgentType[] = []

		if (Array.isArray(parsed.alternativeAgents)) {
			alternativeAgents = parsed.alternativeAgents.filter((agent: string) =>
				availableAgents.includes(agent as AgentType),
			) as AgentType[]
		}

		// Validate confidence (ensure it's a number between 0-1)
		const confidence =
			typeof parsed.confidence === 'number'
				? Math.min(1, Math.max(0, parsed.confidence))
				: 0.7 // Default confidence

		return {
			selectedAgents,
			explanation: parsed.explanation || content,
			confidence,
			alternativeAgents,
		}
	} catch (error) {
		console.error('Failed to parse routing result:', error)

		// Fallback - extract information directly from content
		let selectedAgent: AgentType = availableAgents[0]

		// Try to find agent names in the content
		for (const agent of availableAgents) {
			const regex = new RegExp(`\\b${agent}\\b`, 'i')
			if (regex.test(content)) {
				selectedAgent = agent
				break
			}
		}

		return {
			selectedAgents: isSequential ? [selectedAgent] : selectedAgent,
			explanation:
				'Based on content analysis, routed to the most appropriate agent.',
			confidence: 0.7,
			alternativeAgents: [],
		}
	}
}
