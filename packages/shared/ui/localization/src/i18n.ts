import i18next, { type InitOptions, type Module } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import { detectDeviceLanguage } from './language_detector/index.js'
import { resources } from './resources.js'

/**
 * Changes the current language of the i18n instance.
 * If no language is provided, detects the device language.
 * Falls back to English if no supported language is found.
 */
export const changeLanguage = async (
	language?: ListSupportedLanguagesCodes,
) => {
	const targetLanguage = language ?? detectDeviceLanguage()
	return i18next.changeLanguage(targetLanguage)
}

/**
 * Creates a new i18n instance with optional plugins and config.
 * Uses the provided language in customOptions.lng if specified, otherwise
 * auto-detects the device/browser language.
 */
export const initLocalization = async (
	plugins: Module[] = [],
	customOptions: Partial<
		Omit<InitOptions, 'lng'> & { lng?: ListSupportedLanguagesCodes }
	> = {},
) => {
	const defaultOptions: InitOptions = {
		fallbackLng: ListSupportedLanguagesCodes.eng,
		lng: customOptions.lng ?? detectDeviceLanguage(),
		ns: ['common'],
		resources,
		supportedLngs: Object.values(ListSupportedLanguagesCodes),
	}

	i18next.use(initReactI18next)

	for (const plugin of plugins) {
		i18next.use(plugin)
	}

	await i18next.init({
		...defaultOptions,
		...customOptions,
	})

	return i18next
}
