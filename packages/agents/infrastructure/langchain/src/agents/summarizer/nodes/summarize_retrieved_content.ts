import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import type { SummarizerOutput } from '@pacto-chat/agents-domain'
import { ListLanguageCodes } from '@pacto-chat/shared-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import { extractKeyPoints } from '../../../utils/text_analysis'
import { getLocalizedErrorMessage } from '../../../utils/workflow_middleware'
import type { SummarizerAgentStateType } from '../types'

const SUMMARIZER_PROMPT_TEMPLATE = `
You are a specialized summarization agent.
Create a concise summary of the following text which was retrieved based on a user's query:

RETRIEVED TEXT: {retrievedText}

USER'S ORIGINAL QUERY: {originalQuery}

Instructions:
- Keep the summary clear and concise, directly addressing the user's original query using the retrieved text.
- If the retrieved text is empty or seems irrelevant to the query, state that you couldn't find specific information to summarize for that query.
- Maintain the key points and main ideas from the retrieved text that are relevant to the query.
- Target a {format} format.
- Respond in the language: {language}.
`

const SUMMARIZER_PROMPT = ChatPromptTemplate.fromTemplate(
	SUMMARIZER_PROMPT_TEMPLATE,
)

// Node function for summarizing retrieved content
export async function summarizeRetrievedContentNode(
	state: SummarizerAgentStateType,
	config?: RunnableConfig,
): Promise<Partial<SummarizerAgentStateType>> {
	const retrievedDocs = state.retrievedDocuments

	// Get the user's query from the last message or context
	const lastMessage = state.messages[state.messages.length - 1]
	const userQuery =
		typeof lastMessage?.content === 'string'
			? lastMessage.content
			: state.context?.question

	const language = state.context?.language || ListLanguageCodes.cat // Default to Catalan

	try {
		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Summarizer.summarizeRetrievedContentNode] Missing original question in input',
			)
			return {
				error: 'Original question is missing for summarization context.',
				summarizer: {
					text: getLocalizedErrorMessage('server_error', language),
					originalText: '',
					keyPoints: [],
					length: 0,
					format: 'paragraph',
					language,
				},
			}
		}

		// Check if retrievedDocs indicates an error or no results
		if (
			!retrievedDocs ||
			retrievedDocs.startsWith("No s'ha trobat informació rellevant") ||
			retrievedDocs.startsWith('No se ha encontrado información relevante') ||
			retrievedDocs.startsWith('No relevant information found') ||
			retrievedDocs.startsWith("S'ha produït un error") ||
			retrievedDocs.startsWith('Ha ocurrido un error') ||
			retrievedDocs.startsWith('An error occurred')
		) {
			logAgentsInfraLangchain.debug(
				'[Summarizer.summarizeRetrievedContentNode] No relevant documents or error in retrieval.',
				{ retrievedDocs },
			)

			let summaryText = `No specific information was found to summarize for your query: "${userQuery}".`

			if (
				retrievedDocs &&
				(retrievedDocs.includes('error') || retrievedDocs.includes('Error'))
			) {
				summaryText = `Could not retrieve information to summarize due to an error. Original query: "${userQuery}".`
			}

			const noDocsSummary: SummarizerOutput = {
				text: summaryText,
				originalText: userQuery,
				keyPoints: [],
				length: 0,
				format: 'paragraph',
				language: language,
			}

			return { summarizer: noDocsSummary, error: state.error } // Preserve retrieval error if any
		}

		const llm = new ChatOpenAI({
			modelName: 'gpt-4o',
			temperature: 0.3,
		})
		const summarizeChain = SUMMARIZER_PROMPT.pipe(llm)

		const formatToUse = 'paragraph'

		const summaryResponse = await summarizeChain.invoke(
			{
				retrievedText: retrievedDocs,
				originalQuery: userQuery,
				format: formatToUse,
				language: language,
			},
			config,
		)

		const summaryText = summaryResponse.content.toString()
		const keyPoints = extractKeyPoints(summaryText, 3)

		const output: SummarizerOutput = {
			text: summaryText,
			originalText: userQuery, // Original query
			keyPoints,
			length: summaryText.length,
			format: formatToUse,
			language: language,
		}

		return {
			summarizer: output,
			error: null, // Clear any previous error if summarization succeeds
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Summarizer.summarizeRetrievedContentNode] Error summarizing content',
			{ error },
		)
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error in summarizer'
		return {
			error: errorMessage,
			summarizer: {
				// Provide a fallback summarizer output on error
				text: getLocalizedErrorMessage('server_error', language),
				originalText: userQuery || 'N/A',
				keyPoints: [],
				length: 0,
				format: 'paragraph',
				language: language,
			},
		}
	}
}

export { SUMMARIZER_PROMPT_TEMPLATE }
