import type { LanguageCode } from '@aipacto/shared-domain'

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
	const messageSet = errorMessages[errorCode] ?? errorMessages.default
	return (
		messageSet?.[language] ??
		errorMessages.default?.spa ??
		'An unknown error occurred.'
	)
}
