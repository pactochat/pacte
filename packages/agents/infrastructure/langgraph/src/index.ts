import type { BaseAgentInput, BaseAgentOutput } from '@pacto-chat/agents-domain'
import type { ListLanguageCodes } from '@pacto-chat/shared-domain'
import type { WorkflowStateType } from './state'
import { createRoutedWorkflow, runRoutedWorkflow } from './workflows'
export { WorkflowState } from './state'

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
 * @param input Text input with optional language specification
 * @param messages Optional conversation history
 * @returns Processed output with summary, impact analysis, and simplified text
 */
export const processText = async (
	input: BaseAgentInput,
	messages?: ConversationMessage[],
): Promise<BaseAgentOutput> => {
	try {
		// Include previous messages as context if provided
		const enrichedInput =
			messages && messages.length > 0
				? {
						...input,
						additionalContext: {
							...input.additionalContext,
							conversationHistory: messages,
						},
					}
				: input

		const result = await runRoutedWorkflow(enrichedInput)

		if (result.error) {
			throw new Error(result.error)
		}

		if (!result.output) {
			// If no specific output was generated, create one from the available results
			return createFinalOutput(result, input)
		}

		return result.output
	} catch (error) {
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
 * Helper function to create a final output from the state if not explicitly set
 */
function createFinalOutput(
	state: WorkflowStateType,
	input: BaseAgentInput,
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
			dimensions: state.impact.impacts.map(imp => ({
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
	} else {
		// If no processing occurred, return the original text
		text = input.intent
	}

	// Add workflow history if available
	if (state.messages && state.messages.length > 0) {
		metadata.workflow = {
			steps: state.messages,
		}
	}

	return {
		text,
		language: input.language,
		metadata,
	}
}

/**
 * Create a basic agent input object
 *
 * @param text Text to process
 * @param language Optional language code
 * @returns Formatted input for the agent workflow
 */
export function createAgentInput(
	text: string,
	language?: ListLanguageCodes,
): BaseAgentInput {
	return {
		intent: text,
		language,
	}
}

/**
 * Stream workflow execution for server integration
 * This allows the frontend to receive incremental updates
 *
 * @param input Text input with optional language specification
 * @param messages Optional conversation history
 * @yields Progress updates for each step of the workflow
 */
export const streamWorkflow = async function* (
	input: BaseAgentInput,
	messages?: ConversationMessage[],
) {
	const workflow = createRoutedWorkflow()

	// Include previous messages as context if provided
	const enrichedInput =
		messages && messages.length > 0
			? {
					...input,
					additionalContext: {
						...input.additionalContext,
						conversationHistory: messages,
					},
				}
			: input

	// Initialize the state with the input
	const initialState = {
		input: enrichedInput,
	}

	try {
		// Stream the workflow execution
		for await (const chunk of await workflow.stream(initialState)) {
			// Process each chunk to make it more frontend-friendly
			const processedChunk = processChunk(chunk, input)
			if (processedChunk) {
				yield processedChunk
			}
		}
	} catch (error) {
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
	originalInput: BaseAgentInput,
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
			response: stepData.text || originalInput.intent,
		}),
	}
}
