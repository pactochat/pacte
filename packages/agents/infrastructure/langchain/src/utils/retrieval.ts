import type { LanguageCode } from '@aipacto/shared-domain'
import { getLocalizedErrorMessage } from './errors'

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

	const header = headers[language] || headers.cat
	const formattedResults = results
		.map((result, index) => `[${index + 1}] ${result.pageContent || result}`)
		.join('\n\n---\n\n')

	return `${header}\n\n${formattedResults}`
}
