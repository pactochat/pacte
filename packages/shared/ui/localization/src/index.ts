// export { useTranslation } from 'react-i18next'

// // export * from './language_detector'
// export * from './i18n'
// // // export * from './resources'
// // export * from './utils.native'

// // export {
// // 	default as i18n,
// // 	changeLanguage,
// // 	detectLanguage,
// // } from './i18n'

// export function initLocalization() {
// 	// i18n is already initialized in the i18n module, so this is just a dummy
// 	// function to match your existing API and keep backward compatibility
// 	console.log('i18n is already initialized')
// 	return Promise.resolve()
// }

export { useTranslation } from 'react-i18next'
export { default as i18n, changeLanguage, detectLanguage } from './i18n'
export { languages } from './languages'

export function initLocalization() {
	// i18n is already initialized in the i18n module
	console.log('i18n initialized')
	return Promise.resolve()
}
