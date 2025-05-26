import { HumanMessage } from '@langchain/core/messages'

import type { BaseAgentOutput } from '@aipacto/agents-domain'
import { ListLanguageCodes } from '@aipacto/shared-domain'
import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import { supervisorAgentGraph } from './agents/supervisor'

/**
 * Type representing a message in conversation history
 */
export interface ConversationMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

/**
 * Main function to process text using the agent workflow
 *
 * @param question Text input to process
 * @param language Optional language specification
 * @param additionalContext Optional additional context
 * @param messages Optional conversation history
 * @returns Processed output with summary, impact analysis, and simplified text
 */
export const processText = async (
	question: string,
	language?: ListLanguageCodes,
	additionalContext?: Record<string, unknown>,
	messages?: ConversationMessage[],
): Promise<BaseAgentOutput> => {
	try {
		// Create the initial state
		const initialState = {
			context: {
				question,
				language: language || ListLanguageCodes.cat,
				additionalContext: {
					...additionalContext,
					conversationHistory: messages,
				},
			},
			messages: [new HumanMessage(question)],
		}

		// Run the supervisor agent
		const result = await supervisorAgentGraph.invoke(initialState)

		if (result.error) {
			throw new Error(result.error)
		}

		// Create final output based on agent results
		return createFinalOutput(result, question, language)
	} catch (error) {
		logAgentsInfraLangchain.error('Error in processText', { error })
		// Return an error output
		return {
			text: 'An error occurred during processing',
			metadata: {
				error: error instanceof Error ? error.message : 'Unknown error',
			},
		}
	}
}

/**
 * Helper function to create a final output from the state
 */
function createFinalOutput(
	state: any,
	originalText: string,
	language?: ListLanguageCodes,
): BaseAgentOutput {
	let text = ''
	const metadata: Record<string, unknown> = {}

	// Use the most processed form of the text
	if (state.simplifier) {
		text = state.simplifier.text
		metadata.simplifier = {
			targetLevel: state.simplifier.targetLevel,
			complexityReduction:
				state.simplifier.originalComplexityScore -
				state.simplifier.resultComplexityScore,
		}
	} else if (state.impact) {
		text = state.impact.text
		metadata.impact = {
			overallScore: state.impact.overallImpact,
			dimensions: state.impact.impacts.map((imp: any) => ({
				type: imp.type,
				score: imp.score,
			})),
		}
	} else if (state.summarizer) {
		text = state.summarizer.text
		metadata.summary = {
			keyPoints: state.summarizer.keyPoints,
			length: state.summarizer.length,
			format: state.summarizer.format,
		}
	} else if (state.planner) {
		text = `Plan: ${state.planner.title}\n\nObjectives: ${state.planner.objectives.join(', ')}\n\nTimeline: ${state.planner.timeline}`
		metadata.planner = {
			steps: state.planner.steps,
			resources: state.planner.resources,
		}
	} else {
		// If no processing occurred, return the original text
		text = originalText
	}

	// Add workflow history if available
	if (state.messages && state.messages.length > 0) {
		metadata.workflow = {
			steps: state.messages,
		}
	}

	return {
		text,
		language: language || state.languageDetected || state.context?.language,
		metadata,
	}
}

/**
 * Stream workflow execution for server integration
 * This allows the frontend to receive incremental updates
 *
 * @param question Text input to process
 * @param language Optional language specification
 * @param additionalContext Optional additional context
 * @param messages Optional conversation history
 * @yields Progress updates for each step of the workflow
 */
export const streamWorkflow = async function* (
	question: string,
	language?: ListLanguageCodes,
	additionalContext?: Record<string, unknown>,
	messages?: ConversationMessage[],
) {
	// Initialize the state
	const initialState = {
		context: {
			question,
			language: language || ListLanguageCodes.cat,
			additionalContext: {
				...additionalContext,
				conversationHistory: messages,
			},
		},
		messages: [new HumanMessage(question)],
	}

	try {
		// Stream the supervisor agent execution
		for await (const chunk of await supervisorAgentGraph.stream(initialState)) {
			// Process each chunk to make it more frontend-friendly
			const processedChunk = processChunk(chunk, question)
			if (processedChunk) {
				yield processedChunk
			}
		}
	} catch (error) {
		logAgentsInfraLangchain.error('Error in streamWorkflow', { error })
		// Handle errors during streaming
		yield {
			step: 'error',
			data: {
				text: 'An error occurred during processing',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
		}
	}
}

/**
 * Helper function to process chunks for streaming
 */
function processChunk(
	chunk: Record<string, any>,
	originalText: string,
): Record<string, any> | null {
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
		step: stepName,
		data: stepData,
		// If the step has completed, also include final response
		...(stepName === 'output' && {
			final: true,
			response: stepData.text || originalText,
		}),
	}
}

// Export supervisor agent for direct usage
export { supervisorAgentGraph }
