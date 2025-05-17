import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import type { SummarizerOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../state'
import { extractKeyPoints } from '../utils/text_analysis'
import { truncateText } from '../utils/text_processing'

const SUMMARIZER_PROMPT = ChatPromptTemplate.fromTemplate(`
You are a specialized summarization agent.
Create a concise summary of the following text:

TEXT: {text}

Instructions:
- Keep the summary clear and concise
- Maintain the key points and main ideas
- Target a {format} format
- Respond in the language: {language}
`)

export const createSummarizerAgent = () => {
	// Initialize the LLM
	const llm = new ChatOpenAI({
		modelName: 'gpt-4o',
		temperature: 0.3,
	})

	// Create the chain
	const summarizeChain = SUMMARIZER_PROMPT.pipe(llm)

	return async (
		state: WorkflowStateType,
		config?: RunnableConfig,
	): Promise<Partial<WorkflowStateType>> => {
		try {
			// Get the input text to summarize
			const input = state.input

			// Call the LLM to generate the summary
			const summaryResponse = await summarizeChain.invoke(
				{
					text: input.intent,
					format: 'paragraph',
					language: input.language || 'en',
				},
				config,
			)

			// Extract the summary text from the response
			const summaryText = summaryResponse.content.toString()

			// Extract key points from the summary
			const keyPoints = extractKeyPoints(summaryText, 3)

			// Create the summarizer output
			const output: SummarizerOutput = {
				text: summaryText,
				originalText: input.intent,
				keyPoints,
				length: summaryText.length,
				format: 'paragraph',
				language: input.language,
			}

			return {
				summarizer: output,
				// Move to the next step
				currentStep: 'impact',
			}
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: 'Unknown error in summarizer',
				currentStep: 'end',
			}
		}
	}
}
