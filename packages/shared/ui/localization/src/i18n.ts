import i18next, { type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { ListSupportedLanguagesCodes } from '@aipacto/shared-domain'
import { detectDeviceLanguage, getPreferredLanguage } from './language_utils'
import { languages } from './languages'

import 'intl-pluralrules' // Load Intl.PluralRules polyfill for native

/**
 * Detects the device language and converts it to our ISO 639-3 format
 * Works in both web and native environments
 */
export function detectLanguage(): ListSupportedLanguagesCodes {
	return detectDeviceLanguage()
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
