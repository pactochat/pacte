import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import {
	DMSans_400Regular,
	DMSans_400Regular_Italic,
	DMSans_500Medium,
	DMSans_500Medium_Italic,
	DMSans_700Bold,
	DMSans_700Bold_Italic,
	useFonts,
} from '@expo-google-fonts/dm-sans'
import {
	Literata_400Regular,
	Literata_400Regular_Italic,
	Literata_500Medium,
	Literata_500Medium_Italic,
	Literata_700Bold,
	Literata_700Bold_Italic,
} from '@expo-google-fonts/literata'
import { useLogger } from '@react-navigation/devtools'
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider as NavigationThemeProvider,
	useNavigationContainerRef,
} from '@react-navigation/native'
import { Slot, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import type React from 'react'
import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import FlashMessage from 'react-native-flash-message'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TamaguiProvider } from 'tamagui'

import { tamaguiConfig } from '@pacto-chat/shared-ui-core/theme'
import { initLocalization } from '@pacto-chat/shared-ui-localization'
import { logExpoAuth } from '@pacto-chat/shared-utils-logging'
import { AnimatedSplashScreen } from '~components'
import { ThemeProvider, useTheme } from '~hooks'

import '../tamagui_web.css'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

// Component to handle theme integration with Tamagui and Navigation
function ThemeAwareContent({ children }: { children: React.ReactNode }) {
	const { resolvedTheme, isLoading } = useTheme()

	if (isLoading) {
		return null // Or a loading indicator if preferred
	}

	return (
		<>
			<TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
				<NavigationThemeProvider
					value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}
				>
					{children}
					<StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
					<FlashMessage duration={5000} position='top' floating />
				</NavigationThemeProvider>
			</TamaguiProvider>
		</>
	)
}

export default function RootLayout() {
	const navigationRef = useNavigationContainerRef()
	const systemColorScheme = useColorScheme()
	const [loaded] = useFonts({
		DMSans: DMSans_400Regular,
		DMSansItalic: DMSans_400Regular_Italic,
		DMSansMedium: DMSans_500Medium,
		DMSansMediumItalic: DMSans_500Medium_Italic,
		DMSansBold: DMSans_700Bold,
		DMSansBoldItalic: DMSans_700Bold_Italic,
		Literata: Literata_400Regular,
		LiterataItalic: Literata_400Regular_Italic,
		LiterataMedium: Literata_500Medium,
		LiterataMediumItalic: Literata_500Medium_Italic,
		LiterataBold: Literata_700Bold,
		LiterataBoldItalic: Literata_700Bold_Italic,
	})
	useLogger(navigationRef)

	if (typeof process.env.EXPO_PUBLIC_AUTH_CLERK_PUBLISHABLE_KEY !== 'string') {
		throw new Error(
			'Missing EXPO_PUBLIC_AUTH_CLERK_PUBLISHABLE_KEY in app.config.ts',
		)
	}

	useEffect(() => {
		const init = async () => {
			try {
				await initLocalization()
			} catch (error) {
				logExpoAuth.error('Failed to initialize i18n', { error })
			}
		}
		init()
	}, [])

	if (!loaded) {
		logExpoAuth.debug('Loading fonts...')
		return null
	}

	const content = (
		<SafeAreaProvider>
			{tokenCache ? (
				// Native
				<ClerkProvider
					publishableKey={process.env.EXPO_PUBLIC_AUTH_CLERK_PUBLISHABLE_KEY}
					tokenCache={tokenCache}
				>
					<ThemeProvider defaultTheme='system'>
						<ThemeAwareContent>
							<Slot />
						</ThemeAwareContent>
					</ThemeProvider>
				</ClerkProvider>
			) : (
				// Web
				<ClerkProvider
					publishableKey={process.env.EXPO_PUBLIC_AUTH_CLERK_PUBLISHABLE_KEY}
				>
					<ThemeProvider defaultTheme='system'>
						<ThemeAwareContent>
							<Slot />
						</ThemeAwareContent>
					</ThemeProvider>
				</ClerkProvider>
			)}
		</SafeAreaProvider>
	)

	return (
		<AnimatedSplashScreen
			loading={!loaded}
			image={require('../../assets/splash-icon.png')}
		>
			{content}
		</AnimatedSplashScreen>
	)
}
