import type { LanguageCode } from '@pacto-chat/shared-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import type { WorkflowStateType } from '../old_state'
import { detectLanguage } from '../tools/language_detector'

/**
 * Middleware to track language throughout the workflow
 * @param state Current workflow state
 * @returns Updated state with language information
 */
export async function languageTrackingMiddleware(
	state: Partial<WorkflowStateType>,
): Promise<Partial<WorkflowStateType>> {
	try {
		// Skip if we already have language metadata
		if (state.languageDetected) {
			return state
		}

		// Only process if we have messages
		if (!state.messages || state.messages.length === 0) {
			return state
		}

		// Get the first message (user query)
		const question = state.messages[0]?.content

		if (typeof question !== 'string') {
			return state
		}

		// Detect language of the query
		const language = await detectLanguage(question)
		logAgentsInfraLangchain.debug('Language tracking middleware', {
			language,
			step: state.currentStep,
		})

		// Update state with language information
		return {
			...state,
			languageDetected: language,
		}
	} catch (error) {
		logAgentsInfraLangchain.error('Error in language tracking middleware', {
			error,
		})
		return state
	}
}

/**
 * Get error message in the appropriate language
 * @param errorCode Error code or message
 * @param language Language code
 * @returns Localized error message
 */
export function getLocalizedErrorMessage(
	errorCode: string,
	language: LanguageCode,
): string {
	const errorMessages: Record<string, Record<LanguageCode, string>> = {
		not_found: {
			cat: "No s'ha trobat informació rellevant per aquesta consulta.",
			spa: 'No se ha encontrado información relevante para esta consulta.',
			eng: 'No relevant information found for this query.',
		},
		server_error: {
			cat: "S'ha produït un error en processar la consulta. Si us plau, torneu a intentar-ho.",
			spa: 'Ha ocurrido un error al procesar la consulta. Por favor, inténtelo de nuevo.',
			eng: 'An error occurred while processing your query. Please try again.',
		},
		default: {
			cat: "S'ha produït un error desconegut.",
			spa: 'Ha ocurrido un error desconocido.',
			eng: 'An unknown error occurred.',
		},
	}

	const messageSet = errorMessages[errorCode] || errorMessages['default']
	return messageSet[language] || messageSet['eng']
}

/**
 * Format retrieval results for better presentation
 * @param results Raw retrieval results
 * @param language Detected language
 * @returns Formatted results
 */
export function formatRetrievalResults(
	results: any[],
	language: LanguageCode,
): string {
	if (!results || results.length === 0) {
		return getLocalizedErrorMessage('not_found', language)
	}

	const headers: Record<LanguageCode, string> = {
		cat: 'Informació rellevant trobada:',
		spa: 'Información relevante encontrada:',
		eng: 'Relevant information found:',
	}

	const header = headers[language] || headers['eng']
	const formattedResults = results
		.map((result, index) => `[${index + 1}] ${result.pageContent || result}`)
		.join('\n\n---\n\n')

	return `${header}\n\n${formattedResults}`
}

/**
 * Creates a workflow event logger middleware
 * @returns Middleware function for logging workflow events
 */
export function createWorkflowLogger() {
	return async function workflowLoggerMiddleware(
		state: Partial<WorkflowStateType>,
	): Promise<Partial<WorkflowStateType>> {
		const step = state.currentStep || 'unknown'
		const language =
			(state.metadata?.detectedLanguage as LanguageCode) || 'unknown'

		logAgentsInfraLangchain.debug('Workflow step', {
			step,
			language,
			messageCount: state.messages?.length || 0,
		})

		return state
	}
}
