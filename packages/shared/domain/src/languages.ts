import { Schema as S } from 'effect'

/**
 * Three-letter language codes defined in part three of the standard language codes [ISO 639-3](https://iso639-3.sil.org/code_tables/639/data/all).
 */
export const ListLanguageCodes = {
	cat: 'cat', // Catalan
	eng: 'eng', // English
	spa: 'spa', // Spanish; Castilian
} as const
export type ListLanguageCodes = keyof typeof ListLanguageCodes

export const ListLanguageCodesLiteral = S.Union(
	...Object.values(ListLanguageCodes).map(value => S.Literal(value)),
)
export type ListLanguageCodesLiteral = typeof ListLanguageCodesLiteral.Type

/**
 * Three-letter language codes defined in part three of the standard language codes [ISO 639-3](https://iso639-3.sil.org/code_tables/639/data/all).
 *
 * E.g. 'eng', 'fra', 'spa', 'jpn'
 */
export type LanguageCode =
	(typeof ListLanguageCodes)[keyof typeof ListLanguageCodes]

/**
 * Three-letter language codes supported by the apps. Standard language codes [ISO 639-3](https://iso639-3.sil.org/code_tables/639/data/all).
 */
export const ListSupportedLanguagesCodes = {
	cat: 'cat', // Catalan
	eng: 'eng', // English
	spa: 'spa', // Spanish
} as const
export type ListSupportedLanguagesCodes =
	keyof typeof ListSupportedLanguagesCodes

/**
 * Maps our ISO 639-3 codes to ISO 639-1 codes for browser compatibility
 * Reference: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
 */
export const ListSupportedLanguagesMapperIso3to1 = {
	cat: 'ca', // Catalan
	eng: 'en', // English
	spa: 'es', // Spanish
} as const

/**
 * Reverse mapping of ISO 639-1 to ISO 639-3 codes
 * Generated from ListSupportedLanguagesMapperIso3to1
 */
export const ListSupportedLanguagesMapperIso1to3 = {
	ca: 'cat', // Catalan
	en: 'eng', // English
	es: 'spa', // Spanish
} as const

export type LanguageDeviceLanguageCode =
	(typeof ListSupportedLanguagesMapperIso3to1)[keyof typeof ListSupportedLanguagesMapperIso3to1]

/**
 * Array of supported device language codes (ISO 639-1).
 * Derived from ListSupportedLanguagesMapperIso3to1 to ensure consistency.
 * @example ['ca', 'en', 'es']
 */
export const ListSupportedDeviceLanguageCodes = Object.values(
	ListSupportedLanguagesMapperIso3to1,
) as readonly LanguageDeviceLanguageCode[]

/**
 * Type guard to check if a string is a valid device language code
 */
export function isValidDeviceLanguageCode(
	code: string,
): code is LanguageDeviceLanguageCode {
	return Object.values(ListSupportedLanguagesMapperIso3to1).includes(
		code as any,
	)
}
