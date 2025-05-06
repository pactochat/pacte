import * as Localization from 'expo-localization'
import { isWeb } from 'tamagui'

import {
	type LanguageDeviceLanguageCode,
	ListSupportedLanguagesCodes,
	ListSupportedLanguagesMapperIso1to3,
	isValidDeviceLanguageCode,
} from '@pacto-chat/shared-domain'

/**
 * Gets the user's preferred language from metadata or device
 * Checks both publicMetadata and unsafeMetadata for compatibility
 * @param userMetadata - The user metadata from Clerk or another source
 * @returns A supported language code or 'auto'
 */
export const getPreferredLanguage = (
	userMetadata?: Record<string, unknown> | null,
): keyof typeof ListSupportedLanguagesCodes | 'auto' => {
	if (!userMetadata) {
		return 'auto'
	}

	// First check language in metadata directly (for JWT token case)
	const directLanguage = userMetadata.language as string | undefined
	if (directLanguage === 'auto') {
		return 'auto'
	}
	if (
		directLanguage &&
		Object.keys(ListSupportedLanguagesCodes).includes(directLanguage)
	) {
		return directLanguage as keyof typeof ListSupportedLanguagesCodes
	}

	// Then check in publicMetadata (backend updates)
	const publicMetadata = userMetadata.public_metadata as
		| Record<string, unknown>
		| undefined
	const publicLanguage = publicMetadata?.language as string | undefined
	if (publicLanguage === 'auto') {
		return 'auto'
	}
	if (
		publicLanguage &&
		Object.keys(ListSupportedLanguagesCodes).includes(publicLanguage)
	) {
		return publicLanguage as keyof typeof ListSupportedLanguagesCodes
	}

	// Finally check in unsafeMetadata (frontend updates)
	const unsafeMetadata = userMetadata.unsafe_metadata as
		| Record<string, unknown>
		| undefined
	const unsafeLanguage = unsafeMetadata?.language as string | undefined
	if (unsafeLanguage === 'auto') {
		return 'auto'
	}
	if (
		unsafeLanguage &&
		Object.keys(ListSupportedLanguagesCodes).includes(unsafeLanguage)
	) {
		return unsafeLanguage as keyof typeof ListSupportedLanguagesCodes
	}

	// Fallback to auto
	return 'auto'
}

/**
 * Detects the device language and returns a supported 3-letter code
 * Works in both web and native environments
 * @returns A supported language code
 */
export const detectDeviceLanguage =
	(): keyof typeof ListSupportedLanguagesCodes => {
		let deviceLanguage = 'en'

		try {
			if (isWeb) {
				if (typeof navigator !== 'undefined' && navigator.language) {
					const webLang = navigator.language.split('-')[0]?.toLowerCase()
					if (webLang) {
						deviceLanguage = webLang
					}
				}
			} else {
				const locales = Localization.getLocales()
				const primaryLocale = locales[0]
				if (primaryLocale?.languageCode) {
					deviceLanguage = primaryLocale.languageCode.toLowerCase()
				}
			}
		} catch (error) {
			console.warn('Error detecting device language:', error)
			// Fallback
			return ListSupportedLanguagesCodes.eng
		}

		// Convert to our supported format if valid
		if (isValidDeviceLanguageCode(deviceLanguage)) {
			const mappedLanguage =
				ListSupportedLanguagesMapperIso1to3[
					deviceLanguage as LanguageDeviceLanguageCode
				]
			if (mappedLanguage) {
				return mappedLanguage as keyof typeof ListSupportedLanguagesCodes
			}
		}

		// Default
		return ListSupportedLanguagesCodes.eng
	}
