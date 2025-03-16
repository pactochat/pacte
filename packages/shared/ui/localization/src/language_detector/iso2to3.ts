import type { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'

/**
 * Utility function to map [BCP47](https://www.rfc-editor.org/bcp/bcp47.txt) or ISO 639-1 to ISO 639-3
 */
export const iso2to3: Record<string, ListSupportedLanguagesCodes> = {
	en: 'eng',
	'en-US': 'eng',
	es: 'spa',
	'es-ES': 'spa',
	ca: 'cat',
	'ca-ES': 'cat',
}
