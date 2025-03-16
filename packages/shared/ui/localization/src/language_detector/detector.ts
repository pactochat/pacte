import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import { logSharedInfraUiLocalization } from '@pacto-chat/shared-utils-logging'
import { iso2to3 } from './iso2to3.js'

const log = logSharedInfraUiLocalization.getChildCategory('language-detector')

/**
 * Detects the browser's language in ISO 639-1 form
 * (e.g. "en", "es", "fr"), then maps it to ISO 639-3.
 * Checks all browser languages in order of preference.
 * Falls back to "eng" if no supported language is found.
 */
export function detectDeviceLanguage(): ListSupportedLanguagesCodes {
	// Get all browser languages in order of preference
	const languages = navigator?.languages || [navigator?.language || 'en']
	let detectedLang: ListSupportedLanguagesCodes =
		ListSupportedLanguagesCodes.eng // Default fallback
	let foundSupportedLanguage = false

	for (const lang of languages) {
		const shortLang = lang?.toLowerCase().split('-')[0]
		if (shortLang && shortLang in iso2to3) {
			const mappedLang = shortLang ? iso2to3[shortLang] : undefined

			if (mappedLang) {
				detectedLang = mappedLang
				foundSupportedLanguage = true
				log.debug('Detected web language code', {
					device: lang,
					iso3: detectedLang,
				})
				break
			}
		}
	}

	if (!foundSupportedLanguage && languages.length > 0) {
		log.debug(
			'No supported language found in browser languages, falling back to English',
			{
				availableLanguages: languages,
			},
		)
	}

	return detectedLang
}

/**
 * Validates that the language is a supported language code
 * @param lang - The language code to validate
 * @returns Whether the language code is a supported language code
 */
export const validateQueryParamSupportedLanguage = (
	lang: string | undefined,
): lang is ListSupportedLanguagesCodes => {
	return lang !== undefined && lang in ListSupportedLanguagesCodes
}
