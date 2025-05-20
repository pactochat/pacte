import AsyncStorage from '@react-native-async-storage/async-storage'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'

import type { ThemeName } from '@aipacto/shared-ui-core/theme'
import { logExpoHooks } from '@aipacto/shared-utils-logging'

export const AVAILABLE_THEMES: ThemeName[] = ['light', 'dark', 'system']

const STORAGE_KEY_THEME = 'theme'

// Theme context type
interface ThemeContextType {
	currentTheme: ThemeName
	resolvedTheme: 'light' | 'dark'
	setTheme: (theme: ThemeName) => void
	toggleTheme: () => void
	isLoading: boolean
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
	currentTheme: 'system',
	resolvedTheme: 'light',
	setTheme: () => {},
	toggleTheme: () => {},
	isLoading: true,
})

export interface ThemeProviderProps {
	children: React.ReactNode
	defaultTheme?: ThemeName
}

export const ThemeProvider = ({
	children,
	defaultTheme = 'system',
}: ThemeProviderProps) => {
	const [currentTheme, setCurrentTheme] = useState<ThemeName>(defaultTheme)
	const [isLoading, setIsLoading] = useState(true)

	// Get system color scheme
	const systemColorScheme = useColorScheme() as 'light' | 'dark' | null

	// Determine the actual theme to apply based on currentTheme and system preference
	const resolvedTheme =
		currentTheme === 'system'
			? systemColorScheme || 'light'
			: (currentTheme as 'light' | 'dark')

	// Load saved theme preference on mount
	useEffect(() => {
		const loadThemePreference = async () => {
			try {
				const storedTheme = await AsyncStorage.getItem(STORAGE_KEY_THEME)

				if (storedTheme) {
					// Validate that the stored theme is valid
					if (AVAILABLE_THEMES.includes(storedTheme as ThemeName)) {
						setCurrentTheme(storedTheme as ThemeName)
						logExpoHooks.debug('Loaded theme preference:', storedTheme)
					}
				} else {
					logExpoHooks.debug(
						'No stored theme preference, using default:',
						defaultTheme,
					)
				}
			} catch (error) {
				logExpoHooks.error('Error loading theme preference:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadThemePreference()
	}, [defaultTheme])

	const setTheme = async (theme: ThemeName) => {
		try {
			setCurrentTheme(theme)

			if (theme === 'system') {
				// Remove from storage when using system theme
				await AsyncStorage.removeItem(STORAGE_KEY_THEME)
				logExpoHooks.debug('Removed theme preference, using system theme')
			} else {
				// Store theme preference
				await AsyncStorage.setItem(STORAGE_KEY_THEME, theme)
				logExpoHooks.debug('Saved theme preference:', theme)
			}
		} catch (error) {
			logExpoHooks.error('Error setting theme preference:', error)
		}
	}

	const toggleTheme = () => {
		if (currentTheme === 'light') {
			setTheme('dark')
		} else if (currentTheme === 'dark') {
			setTheme('light')
		} else {
			// If system, toggle based on what's currently showing
			setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
		}
	}

	const contextValue: ThemeContextType = {
		currentTheme,
		resolvedTheme,
		setTheme,
		toggleTheme,
		isLoading,
	}

	return (
		<ThemeContext.Provider value={contextValue}>
			{children}
		</ThemeContext.Provider>
	)
}

export const useTheme = () => useContext(ThemeContext)
