// import * as Localization from 'expo-localization'
// // 1. First, let's fix the i18n.ts file by updating the imports
// // packages/shared/ui/localization/src/i18n.ts
// import i18next from 'i18next'
// import { initReactI18next } from 'react-i18next'

// import {
// 	ListSupportedLanguagesCodes,
// 	ListSupportedLanguagesMapperIso1to3,
// } from '@pacto-chat/shared-domain'
// import { resources } from './resources'

// /**
//  * Detects the device language and converts it to our ISO 639-3 format
//  */
// export function detectLanguage(): ListSupportedLanguagesCodes {
// 	try {
// 		// Get device locale (works in both web and native)
// 		const locales = Localization.getLocales()
// 		const locale = locales[0]?.languageCode || 'en'

// 		// Use just the language code part (in case it's something like 'en-US')
// 		const languageCode = (locale.split('-')[0] ?? 'en').toLowerCase()

// 		// Convert from ISO 639-1 to our ISO 639-3 format
// 		const iso3Code =
// 			ListSupportedLanguagesMapperIso1to3[
// 				languageCode as keyof typeof ListSupportedLanguagesMapperIso1to3
// 			]

// 		// If we don't support this language, fall back to English
// 		return iso3Code || ListSupportedLanguagesCodes.eng
// 	} catch (error) {
// 		console.warn('Failed to detect device language:', error)
// 		return ListSupportedLanguagesCodes.eng
// 	}
// }

// const i18n = i18next.use(initReactI18next).init({
// 	resources,
// 	lng: detectLanguage(),
// 	fallbackLng: ListSupportedLanguagesCodes.eng,
// 	interpolation: {
// 		escapeValue: false, // React already escapes by default
// 	},
// 	react: {
// 		useSuspense: false, // Disable Suspense to avoid issues
// 	},
// })

// // Utility function to change language
// export const changeLanguage = (language: ListSupportedLanguagesCodes) => {
// 	return i18next.changeLanguage(language)
// }
// export default i18next

import * as Localization from 'expo-localization'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import {
	ListSupportedLanguagesCodes,
	ListSupportedLanguagesMapperIso1to3,
} from '@pacto-chat/shared-domain'
import { languages } from './languages'

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

const i18n = i18next.use(initReactI18next).init({
	resources: languages,
	lng: detectLanguage(),
	fallbackLng: ListSupportedLanguagesCodes.eng,
	interpolation: {
		escapeValue: false, // React already escapes by default
	},
	react: {
		useSuspense: false, // Disable Suspense to avoid issues
	},
})

// Utility function to change language
export const changeLanguage = (language: ListSupportedLanguagesCodes) => {
	return i18next.changeLanguage(language)
}

export default i18n
