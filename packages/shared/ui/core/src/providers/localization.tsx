// import {
// 	type ReactNode,
// 	createContext,
// 	useContext,
// 	useEffect,
// 	useState,
// } from 'react'
// import { ActivityIndicator, Text, View } from 'react-native'

// import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
// import {
// 	changeLanguage,
// 	initLocalization,
// } from '@pacto-chat/shared-ui-localization'

// // Create a simple loading component to avoid circular dependencies
// const LoadingFallback = () => (
// 	<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
// 		<ActivityIndicator size='large' color='#0000ff' />
// 		<Text style={{ marginTop: 10 }}>Loading localization...</Text>
// 	</View>
// )

// /**
//  * Context type for the localization system.
//  */
// type LocalizationContextType = {
// 	isInitialized: boolean
// 	currentLanguage: ListSupportedLanguagesCodes
// 	changeLanguage: (lang: ListSupportedLanguagesCodes) => Promise<void>
// }

// const LocalizationContext = createContext<LocalizationContextType | null>(null)

// /**
//  * Props for the LocalizationProvider component.
//  */
// type LocalizationProviderProps = {
// 	children: ReactNode
// 	initialLanguage?: ListSupportedLanguagesCodes | undefined
// }

// /**
//  * Debug version of the LocalizationProvider
//  */
// export function LocalizationProvider({
// 	children,
// 	initialLanguage,
// }: LocalizationProviderProps) {
// 	console.log(
// 		'LocalizationProvider: Rendering with initialLanguage =',
// 		initialLanguage,
// 	)

// 	const [isInitialized, setIsInitialized] = useState(false)
// 	const [error, setError] = useState<Error | null>(null)
// 	const [currentLanguage, setCurrentLanguage] =
// 		useState<ListSupportedLanguagesCodes>(ListSupportedLanguagesCodes.eng)

// 	useEffect(() => {
// 		console.log('LocalizationProvider: Running initialization effect')

// 		async function setupLocalization() {
// 			try {
// 				console.log('LocalizationProvider: Starting initLocalization')

// 				// Initialize i18next with the initial language if provided
// 				const i18nInstance = await initLocalization(
// 					[],
// 					initialLanguage ? { lng: initialLanguage } : {},
// 				)

// 				console.log(
// 					'LocalizationProvider: initLocalization succeeded',
// 					i18nInstance,
// 				)

// 				setIsInitialized(true)

// 				if (initialLanguage) {
// 					console.log(
// 						'LocalizationProvider: Setting initial language to',
// 						initialLanguage,
// 					)
// 					setCurrentLanguage(initialLanguage)
// 				}
// 			} catch (err) {
// 				console.error(
// 					'LocalizationProvider: Error initializing localization:',
// 					err,
// 				)
// 				setError(err instanceof Error ? err : new Error(String(err)))

// 				// Still mark as initialized to prevent blocking the app
// 				setIsInitialized(true)
// 			}
// 		}

// 		setupLocalization()
// 	}, [initialLanguage])

// 	const handleChangeLanguage = async (lang: ListSupportedLanguagesCodes) => {
// 		console.log('LocalizationProvider: Changing language to', lang)
// 		try {
// 			await changeLanguage(lang)
// 			setCurrentLanguage(lang)
// 			console.log(
// 				'LocalizationProvider: Language changed successfully to',
// 				lang,
// 			)
// 		} catch (err) {
// 			console.error('LocalizationProvider: Error changing language:', err)
// 		}
// 	}

// 	// Show error state
// 	if (error) {
// 		console.log('LocalizationProvider: Rendering error state')
// 		return (
// 			<View style={{ padding: 20 }}>
// 				<Text style={{ color: 'red', fontWeight: 'bold' }}>
// 					Localization Error: {error.message}
// 				</Text>
// 				<View style={{ marginTop: 20 }}>{children}</View>
// 			</View>
// 		)
// 	}

// 	// Show loading state
// 	if (!isInitialized) {
// 		console.log('LocalizationProvider: Rendering loading state')
// 		return <LoadingFallback />
// 	}

// 	console.log(
// 		'LocalizationProvider: Rendering initialized state with language =',
// 		currentLanguage,
// 	)

// 	return (
// 		<LocalizationContext.Provider
// 			value={{
// 				isInitialized,
// 				currentLanguage,
// 				changeLanguage: handleChangeLanguage,
// 			}}
// 		>
// 			{children}
// 		</LocalizationContext.Provider>
// 	)
// }

// /**
//  * Hook to access the localization context.
//  */
// export const useLocalization = () => {
// 	const context = useContext(LocalizationContext)
// 	if (!context) {
// 		throw new Error('useLocalization must be used within LocalizationProvider')
// 	}
// 	return context
// }
