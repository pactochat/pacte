import type { i18n as I18nInstance } from 'i18next'
import { initI18n } from './i18n'

// Exports
export { useTranslation } from 'react-i18next'
export {
	default as i18n,
	changeLanguage,
	detectLanguage,
	initI18n,
} from './i18n'
export { languages } from './languages'

export async function initLocalization(): Promise<I18nInstance> {
	return initI18n()
}
