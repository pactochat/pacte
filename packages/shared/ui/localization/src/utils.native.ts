import type { Locale } from 'expo-localization'

import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import { iso2to3 } from './language_detector/index.js'

export const supportedLanguages = Object.values(ListSupportedLanguagesCodes)

export const findSupportedLanguage = (
	locales: Locale[],
): string | undefined => {
	for (const locale of locales) {
		const mappedLanguage = iso2to3[locale.languageTag]
		if (mappedLanguage) return mappedLanguage
	}
	return undefined
}
