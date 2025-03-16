import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react'

import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import { CoPage } from '@pacto-chat/shared-ui-core/components'
import {
	changeLanguage,
	initLocalization,
} from '@pacto-chat/shared-ui-localization'

/**
 * Context type for the localization system.
 * Provides access to the current language state and methods to change it.
 */
type LocalizationContextType = {
	isInitialized: boolean
	currentLanguage: ListSupportedLanguagesCodes
	changeLanguage: (lang: ListSupportedLanguagesCodes) => Promise<void>
}

const LocalizationContext = createContext<LocalizationContextType | null>(null)

/**
 * Props for the LocalizationProvider component.
 * @property {ReactNode} children - Child components to render
 * @property {ListSupportedLanguagesCodes | undefined} initialLanguage - Optional initial language to use
 *   - In web: Typically the language from URL (e.g., /eng/settings)
 *   - In React Native: Not used, falls back to device language
 */
type LocalizationProviderProps = {
	children: ReactNode
	initialLanguage?: ListSupportedLanguagesCodes | undefined
}

/**
 * Provider component for the application's localization system.
 *
 * Language Priority Order:
 * 1. Creator's language preferences (if set, handled by SessionSynchronizer)
 * 2. URL language parameter (web only, passed as initialLanguage)
 * 3. Device language (fallback)
 * 4. English (ultimate fallback)
 *
 * @example
 * ```tsx
 * // Web usage with URL language
 * <LocalizationProvider initialLanguage={getInitialLanguage()}>
 *   <App />
 * </LocalizationProvider>
 *
 * // React Native usage (no initialLanguage needed)
 * <LocalizationProvider>
 *   <App />
 * </LocalizationProvider>
 * ```
 */
export function LocalizationProvider({
	children,
	initialLanguage,
}: LocalizationProviderProps) {
	const [isInitialized, setIsInitialized] = useState(false)
	const [currentLanguage, setCurrentLanguage] =
		useState<ListSupportedLanguagesCodes>(ListSupportedLanguagesCodes.eng)

	useEffect(() => {
		// Initialize i18next with the initial language if provided
		// This is typically the URL language in web or undefined in React Native
		initLocalization([], initialLanguage ? { lng: initialLanguage } : {})
			.then(() => {
				setIsInitialized(true)
				if (initialLanguage) {
					setCurrentLanguage(initialLanguage)
				}
			})
			.catch(console.error)
	}, [initialLanguage])

	const handleChangeLanguage = async (lang: ListSupportedLanguagesCodes) => {
		await changeLanguage(lang)
		setCurrentLanguage(lang)
	}

	if (!isInitialized) {
		return <CoPage componentName='localization-provider' isLoading />
	}

	return (
		<LocalizationContext.Provider
			value={{
				isInitialized,
				currentLanguage,
				changeLanguage: handleChangeLanguage,
			}}
		>
			{children}
		</LocalizationContext.Provider>
	)
}

/**
 * Hook to access the localization context.
 * Provides access to the current language and methods to change it.
 *
 * @throws {Error} If used outside of LocalizationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentLanguage, changeLanguage } = useLocalization();
 *
 *   return (
 *     <button onClick={() => changeLanguage(ListSupportedLanguagesCodes.eng)}>
 *       Current: {currentLanguage}
 *     </button>
 *   );
 * }
 * ```
 */
export const useLocalization = () => {
	const context = useContext(LocalizationContext)
	if (!context) {
		throw new Error('useLocalization must be used within LocalizationProvider')
	}
	return context
}
