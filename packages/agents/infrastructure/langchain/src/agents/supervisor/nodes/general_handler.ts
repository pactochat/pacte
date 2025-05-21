import {
	AIMessage,
	HumanMessage,
	SystemMessage,
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'

import { ListLanguageCodes } from '@aipacto/shared-domain'
import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import { getLanguageSpecificPrompt } from '../../../tools/language'
import type { SupervisorState, SupervisorUpdate } from '../types'

/**
 * General handler for queries that don't match specific agents
 */
export async function generalHandler(
	state: SupervisorState,
): Promise<Partial<SupervisorUpdate>> {
	try {
		logAgentsInfraLangchain.debug(
			'[Supervisor.generalHandler] Processing general query',
		)

		// Get the user's query from the last message or context
		const lastMessage = state.messages[state.messages.length - 1]
		const userQuery =
			typeof lastMessage?.content === 'string'
				? lastMessage.content
				: state.context?.question

		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Supervisor.generalHandler] Missing question in input',
			)
			return {
				error: 'Question is missing',
				messages: [
					new AIMessage(
						'I need a question to help you. Could you please provide one?',
					),
				],
			}
		}

		// // Get language-specific context
		// const language =
		// 	state.languageDetected || state.context?.language || ListLanguageCodes.cat
		// const contextDescription =
		const contextDescription =
			'You are a helpful municipal assistant that provides information to citizens.'
		// const promptTemplate = getLanguageSpecificPrompt(
		// 	// language,
		// 	contextDescription,
		// )

		// Set up the LLM
		const llm = new ChatOpenAI({
			model: 'gpt-4o',
			temperature: 0.7,
		})

		// Create system message
		const systemMessage = new SystemMessage(contextDescription)

		// Call the LLM
		const response = await llm.invoke([
			systemMessage,
			new HumanMessage(userQuery),
		])

		logAgentsInfraLangchain.debug(
			'[Supervisor.generalHandler] Generated response',
		)

		// Return the response
		return {
			messages: [response],
			error: null,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Supervisor.generalHandler] Error generating response',
			{ error },
		)

		return {
			error:
				error instanceof Error
					? error.message
					: 'Unknown error in general handler',
			messages: [
				new AIMessage(
					'I encountered an error while processing your request. Please try again.',
				),
			],
		}
	}
}
