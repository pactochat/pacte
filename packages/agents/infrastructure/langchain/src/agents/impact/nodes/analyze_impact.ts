import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import type { ImpactAgentStateType } from '../types'

export async function analyzeImpactNode(
	state: ImpactAgentStateType,
	config?: RunnableConfig,
): Promise<Partial<ImpactAgentStateType>> {
	try {
		// Get the user's query from the last message or context
		const lastMessage = state.messages[state.messages.length - 1]
		const userQuery =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: state.context?.question

		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Impact.analyzeImpactNode] Missing question in input',
			)
			return {
				error: 'Question is missing for impact analysis',
			}
		}

		// Setup the model
		const llm = new ChatOpenAI({
			modelName: 'gpt-4o',
			temperature: 0.2,
		})

		// Create the prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
You are an impact analysis expert. Analyze the following text for its potential impact:

TEXT: {text}

Provide an analysis of the potential impact in these dimensions:
- Social impact
- Economic impact
- Environmental impact
- Political impact

For each dimension, provide a score from 1-10 and a brief explanation.
Also provide an overall impact score from 1-10.

Format your response as JSON:
{
  "text": "summary of the text",
  "overallImpact": number,
  "impacts": [
    {
      "type": "social",
      "score": number,
      "explanation": "explanation"
    },
    // other dimensions...
  ]
}
`)

		// Run the impact analysis
		const chain = prompt.pipe(llm)
		const response = await chain.invoke({ text: userQuery }, config)

		// Parse the response
		const responseText = response.content.toString()
		const jsonMatch = responseText.match(/({[\s\S]*})/)

		if (!jsonMatch || !jsonMatch[1]) {
			throw new Error('Failed to parse impact analysis response')
		}

		const impactData = JSON.parse(jsonMatch[1])

		return {
			impact: impactData,
			error: null,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Impact.analyzeImpactNode] Error analyzing impact',
			{ error },
		)

		return {
			error:
				error instanceof Error
					? error.message
					: 'Unknown error in impact analysis',
		}
	}
}
