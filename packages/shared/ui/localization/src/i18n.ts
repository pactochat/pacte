import * as Localization from 'expo-localization'
import i18next, { type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
	ListSupportedLanguagesCodes,
	ListSupportedLanguagesMapperIso1to3,
} from '@pacto-chat/shared-domain'
import { languages } from './languages'

import 'intl-pluralrules' // Load Intl.PluralRules polyfill for native

/**
 * Detects the device language and converts it to our ISO 639-3 format
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
		console.warn('Failed to detect language:', error)
		return ListSupportedLanguagesCodes.eng
	}
}

// Initialize i18next instance
const i18n: I18nInstance = i18next.createInstance()

// Configure and initialize i18next
export const initI18n = async (): Promise<I18nInstance> => {
	if (i18n.isInitialized) {
		return i18n
	}

	await i18n.use(initReactI18next).init({
		resources: languages,
		lng: detectLanguage(),
		fallbackLng: ListSupportedLanguagesCodes.eng,
		defaultNS: 'common',
		interpolation: {
			escapeValue: false, // React already escapes by default
		},
		react: {
			useSuspense: false, // Disable Suspense to avoid issues
		},
	})

	return i18n
}

// Utility function to change language
export const changeLanguage = (language: ListSupportedLanguagesCodes) => {
	return i18n.changeLanguage(language)
}

export default i18n
