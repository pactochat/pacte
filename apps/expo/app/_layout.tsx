import { useLogger } from '@react-navigation/devtools'
import {
	NavigationContainer,
	useNavigationContainerRef,
} from '@react-navigation/native'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useCallback, useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { CoPage, CoText } from '@pacto-chat/shared-ui-core'
import { TamaguiProvider, tamaguiConfig } from '@pacto-chat/shared-ui-core'
import { initLocalization } from '@pacto-chat/shared-ui-localization'
import {
	JotaiProvider,
	LocalizationProvider,
} from '@pacto-chat/shared-ui-providers'

// import './providers/supertokens'
initLocalization()

// Prevent the splash screen from auto-hiding before asset & fetching are complete.
SplashScreen.preventAutoHideAsync()
	.then(result =>
		console.debug(`SplashScreen.preventAutoHideAsync() succeeded: ${result}`),
	)
	.catch(console.warn)

export function App() {
	const navigationRef = useNavigationContainerRef()
	useLogger(navigationRef)
	const [fontsLoaded, fontError] = useFonts({
		Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
		InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
	})
	const [isAppReady, setIsAppReady] = useState(false)
	// const [themeLoaded, setThemeLoaded] = useState(false)

	useEffect(() => {
		async function prepareApp() {
			try {
				// await loadThemePromise
				// 	loadThemePromise.then(() => {
				// 		setThemeLoaded(true)
				// 	})
				setIsAppReady(true)
			} catch (error) {
				console.warn('Error preparing the app:', error)
				setIsAppReady(false)
			} finally {
				setIsAppReady(true)
			}
		}

		prepareApp()
	}, [])

	const onLayoutRootView = useCallback(async () => {
		if (fontsLoaded && isAppReady) {
			await SplashScreen.hideAsync()
		}
	}, [fontsLoaded, isAppReady])

	if (!fontsLoaded || fontError || !isAppReady) return null

	return (
		<GestureHandlerRootView>
			<NavigationContainer ref={navigationRef}>
				<JotaiProvider>
					<LocalizationProvider>
						<SafeAreaProvider onLayout={onLayoutRootView}>
							<TamaguiProvider config={tamaguiConfig}>
								<CoPage>
									<CoText>Open up App.tsx to start working on your app!</CoText>
								</CoPage>
							</TamaguiProvider>
						</SafeAreaProvider>
					</LocalizationProvider>
				</JotaiProvider>
			</NavigationContainer>
		</GestureHandlerRootView>
	)
}
