import * as Localization from 'expo-localization'

import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import { logSharedInfraUiLocalization } from '@pacto-chat/shared-utils-logging'
import { iso2to3 } from './iso2to3.js'

const log = logSharedInfraUiLocalization.getChildCategory(
	'localization/language-detector',
)

/**
 * Attempts to detect the user's device language in ISO 639-1 form
 * (e.g. "en", "es", "fr"), then maps it to ISO 639-3 (e.g. "eng", "spa", "fra").
 * Checks all device locales in order of preference.
 * Falls back to "eng" if no supported language is found.
 */
export function detectDeviceLanguage(): ListSupportedLanguagesCodes {
	const locales = Localization.getLocales()
	let detectedLang: ListSupportedLanguagesCodes =
		ListSupportedLanguagesCodes.eng // Default fallback
	let foundSupportedLanguage = false

	// Try each locale in order until it finds a supported language
	for (const locale of locales) {
		const langCode = locale.languageCode?.toLowerCase()
		const mappedLang = langCode ? iso2to3[langCode] : undefined
		if (mappedLang) {
			detectedLang = mappedLang
			foundSupportedLanguage = true
			log.debug('Detected native language code', {
				device: locale.languageTag,
				iso3: detectedLang,
			})
			break
		}
	}

	if (!foundSupportedLanguage && locales.length > 0) {
		log.debug(
			'No supported language found in device locales, falling back to English',
			{
				availableLocales: locales.map(l => l.languageTag),
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
