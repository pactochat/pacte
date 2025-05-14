import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type {
	SummarizerInput,
	SummarizerOutput,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../old_state'
import { extractKeyPoints, logAgentExecution } from './utils'

/**
 * Implementation of the summarizer node for LangGraph
 */
export async function summarizerNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('summarizer', 'started')

		// Get input from state
		const input = state.input as SummarizerInput
		const maxLength = input.maxLength || 1000
		const preserveKeyPoints = input.preserveKeyPoints || []
		const format = input.format || 'paragraph'

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert summarizer. Create a concise summary of the following text in {format} format.
      The summary should be no longer than {maxLength} characters.
      
      Make sure that these key points are included in the summary:
      {preserveKeyPoints}
      
      Maintain the main ideas, important details, and overall message of the original text.
      
      Original text:
      {text}
      
      {format} summary:
    `)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Summarize the following text in ${format} format: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			text: input.text,
			maxLength,
			preserveKeyPoints: preserveKeyPoints.join('\n- ') || 'None specified',
			format,
		})

		// Add response to messages
		messages.push(response)

		// Create the summary text
		const summaryText = response.content as string

		// Extract key points
		const keyPoints =
			preserveKeyPoints.length > 0
				? preserveKeyPoints
				: extractKeyPoints(input.text, 5)

		// Calculate compression ratio
		const compressionRatio = summaryText.length / input.text.length

		// Estimate reading time (average 200 words per minute)
		const words = summaryText.split(/\s+/).length
		const readingTime = Math.ceil((words / 200) * 60) // in seconds

		// Create the output
		const output: SummarizerOutput = {
			text: summaryText,
			originalText: input.text,
			keyPoints,
			length: summaryText.length,
			readingTime,
			format: format as any, // TypeScript type conversion
			compressionRatio,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		// Log completion
		const completeLog = logAgentExecution('summarizer', 'completed')

		// Return updated state
		return {
			output,
			agentOutputs: { summarizer: output },
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('summarizer', 'failed')

		// Return error state
		return {
			error: `Error in summarizer: ${error}`,
			executionLog: [errorLog],
		}
	}
}
