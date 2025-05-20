import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import type { SimplifierLevel } from '@aipacto/agents-domain'
import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import { calculateComplexityScore } from '../../../utils/text_analysis'
import type { SimplifierAgentStateType } from '../types'

export async function simplifyTextNode(
	state: SimplifierAgentStateType,
	config?: RunnableConfig,
): Promise<Partial<SimplifierAgentStateType>> {
	try {
		// Get the user's query from the last message or context
		const lastMessage = state.messages[state.messages.length - 1]
		const userQuery =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: state.context?.question

		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Simplifier.simplifyTextNode] Missing question in input',
			)
			return {
				error: 'Question is missing for simplification',
			}
		}

		const originalComplexityScore = calculateComplexityScore(userQuery)
		const targetLevel: SimplifierLevel = 'citizen'

		const llm = new ChatOpenAI({
			modelName: 'gpt-4o',
			temperature: 0.2,
		})

		const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert at simplifying complex text. Simplify the following text to make it more accessible:

TEXT: {text}

TARGET LEVEL: {targetLevel}

Guidelines:
- Use simpler vocabulary
- Use shorter sentences
- Explain technical terms
- Maintain the key meaning and information
- Make the text more approachable

Simplified text:
`)

		// Run the simplification
		const chain = prompt.pipe(llm)
		const response = await chain.invoke(
			{
				text: userQuery,
				targetLevel,
			},
			config,
		)

		// Get simplified text
		const simplifiedText = response.content.toString()

		// Calculate new complexity
		const resultComplexityScore = calculateComplexityScore(simplifiedText)

		return {
			simplifier: {
				text: simplifiedText,
				originalText: userQuery,
				targetLevel,
				originalComplexityScore,
				resultComplexityScore,
			},
			error: null,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Simplifier.simplifyTextNode] Error simplifying text',
			{ error },
		)

		return {
			error:
				error instanceof Error
					? error.message
					: 'Unknown error in simplification',
		}
	}
}
