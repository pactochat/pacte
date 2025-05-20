import type { RunnableConfig } from '@langchain/core/runnables'

import { ListLanguageCodes } from '@pacto-chat/shared-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import { detectLanguage } from '../../../tools/language_detector'
import { languageAwareEmbeddings } from '../../../utils/embedding_robertaca'
import { qdrantClient } from '../../../utils/qdrant'
import { buildQdrantFilter } from '../../../utils/qdrant_utils'
import {
	formatRetrievalResults,
	getLocalizedErrorMessage,
} from '../../../utils/workflow_middleware'
import type { SummarizerAgentStateType } from '../types'

const COLLECTION_NAME =
	process.env.QDRANT_COLLECTION_NAME || 'pacto_city_council_info' // Or a more generic default

export async function retrieveDocumentsNode(
	state: SummarizerAgentStateType,
	config?: RunnableConfig,
): Promise<Partial<SummarizerAgentStateType>> {
	// Get the user's query from the last message or context
	const lastMessage = state.messages[state.messages.length - 1]
	const userQuery =
		typeof lastMessage?.content === 'string'
			? lastMessage.content
			: state.context?.question

	if (!userQuery) {
		logAgentsInfraLangchain.warn(
			'[Summarizer.retrieveDocumentsNode] Missing question in input',
		)
		return {
			retrievedDocuments: getLocalizedErrorMessage(
				'server_error',
				state.context?.language || ListLanguageCodes.cat,
			),
			error: 'Question is missing.',
		}
	}

	const language = state.context?.language
	const additionalContext = state.context?.additionalContext

	try {
		logAgentsInfraLangchain.debug(
			'[Summarizer.retrieveDocumentsNode] Retrieving documents',
			{ userQuery, language, additionalContext },
		)

		const detectedLang = language || (await detectLanguage(userQuery))

		const queryVector = await languageAwareEmbeddings.embedQuery(userQuery)

		// Use additionalContext for filtering if provided
		const filterMetadata = additionalContext?.filterMetadata as
			| Record<string, unknown>
			| undefined
		const qdrantFilter = buildQdrantFilter(filterMetadata)

		const results = await qdrantClient.search(COLLECTION_NAME, {
			vector: queryVector,
			limit: 15,
			// filter: qdrantFilter || undefined,
		})

		const formattedDocs = formatRetrievalResults(results, detectedLang)

		return {
			retrievedDocuments: formattedDocs,
			error: null,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Summarizer.retrieveDocumentsNode] Error retrieving documents',
			{ error },
		)
		const langForError = language || ListLanguageCodes.cat
		return {
			retrievedDocuments: getLocalizedErrorMessage(
				'server_error',
				langForError,
			),
			error: error instanceof Error ? error.message : 'Unknown retrieval error',
		}
	}
}
