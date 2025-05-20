import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import type { SimplifierOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../old_state'
import { calculateComplexityScore } from '../utils/text_analysis'

// Create the prompt template
const SIMPLIFIER_PROMPT = ChatPromptTemplate.fromTemplate(`
You are a specialized text simplification agent.
Simplify the following text to make it more accessible to a {audience} audience.

TEXT: {text}

CONTEXT (Impact Analysis): {impactAnalysis}

Instructions:
- Simplify vocabulary and sentence structure
- Maintain the key points and meaning
- Target a reading level appropriate for {audience}
- Keep explanations clear and concise
- Respond in the language: {language}
`)

export const createSimplifierAgent = () => {
	// Initialize the LLM
	const llm = new ChatOpenAI({
		modelName: 'gpt-4o',
		temperature: 0.3,
	})

	// Create the chain
	const simplifyChain = SIMPLIFIER_PROMPT.pipe(llm)

	return async (
		state: WorkflowStateType,
		config?: RunnableConfig,
	): Promise<Partial<WorkflowStateType>> => {
		try {
			// Ensure we have both summarizer and impact outputs
			if (!state.summarizer || !state.impact) {
				throw new Error(
					'Both summarizer and impact outputs are required for simplification',
				)
			}

			// Calculate complexity score of original text
			const originalComplexityScore = calculateComplexityScore(
				state.summarizer.text,
			)

			// Define the target audience
			const audience = 'citizen'

			// Call the LLM to generate the simplified text
			const simplifiedResponse = await simplifyChain.invoke(
				{
					text: state.summarizer.text,
					impactAnalysis: state.impact.summary,
					audience,
					language: state.input.language || 'en',
				},
				config,
			)

			// Extract the simplified text
			const simplifiedText = simplifiedResponse.content.toString()

			// Calculate complexity score of simplified text
			const resultComplexityScore = calculateComplexityScore(simplifiedText)

			// Create the output
			const output: SimplifierOutput = {
				text: simplifiedText,
				originalText: state.summarizer.text,
				targetLevel: audience,
				originalComplexityScore,
				resultComplexityScore,
				language: state.input.language,
			}

			// Final combined output for streaming
			const finalOutput = {
				...output,
				summary: state.summarizer.text,
				impacts: state.impact.text,
			}

			return {
				simplifier: output,
				output: finalOutput,
				currentStep: 'end',
			}
		} catch (error) {
			return {
				error:
					error instanceof Error
						? error.message
						: 'Unknown error in simplification',
				currentStep: 'end',
			}
		}
	}
}
