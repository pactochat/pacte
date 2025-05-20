import * as Localization from 'expo-localization'
import i18next, { type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
	ListSupportedLanguagesCodes,
	ListSupportedLanguagesMapperIso1to3,
} from '@aipacto/shared-domain'
import { logSharedUiLocalization } from '@aipacto/shared-utils-logging'
import { getPreferredLanguage } from './language_utils'
import { languages } from './languages'

import 'intl-pluralrules' // Load Intl.PluralRules polyfill for native

/**
 * Detects the device language and converts it to our ISO 639-3 format
 * Works in both web and native environments
 */
export function detectLanguage(): ListSupportedLanguagesCodes {
	try {
		// Get device locale (works in both web and native)
		const locales = Localization.getLocales()
		const locale = locales[0]?.languageCode || 'en'

		// Use just the language code part (in case it's something like 'en-US')
		const languageCode = (locale.split('-')[0] ?? 'en').toLowerCase()

		// Convert from ISO 639-1 to our ISO 639-3 format
		const iso3Code =
			ListSupportedLanguagesMapperIso1to3[
				languageCode as keyof typeof ListSupportedLanguagesMapperIso1to3
			]

		// If we don't support this language, fall back to English
		return iso3Code || ListSupportedLanguagesCodes.eng
	} catch (error) {
		logSharedUiLocalization.warn('Failed to detect language:', error)
		return ListSupportedLanguagesCodes.eng
	}
}

// Initialize i18next instance
const i18n: I18nInstance = i18next.createInstance()

/**
 * Initialize i18n with the appropriate language
 * @param userMetadata - Optional user metadata to extract language preference
 * @returns The initialized i18n instance
 */
export const initI18n = async (
	userMetadata?: Record<string, unknown> | null,
) => {
	if (i18n.isInitialized) {
		return i18n
	}

	// Determine language from user metadata or device
	const language = getPreferredLanguage(userMetadata)

	await i18n.use(initReactI18next).init({
		resources: languages,
		lng: language,
		fallbackLng: ListSupportedLanguagesCodes.eng,
		defaultNS: 'common',
		interpolation: {
			escapeValue: false, // React already escapes by default
		},
		react: {
			useSuspense: false, // Disable Suspense to avoid issues
		},
		// debug: __DEV__, // Enable debug only in development
	})

	return i18n
}

/**
 * Change the application language
 * @param language - The language code to change to
 * @returns A promise that resolves when the language has been changed
 */
export const changeLanguage = (
	language: ListSupportedLanguagesCodes | 'auto',
) => {
	return i18n.changeLanguage(language)
}

export default i18n
