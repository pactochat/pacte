import { Theme } from '@pacto-chat/shared-ui-core/theme'
import {
	atomTheme,
	useAtomValue,
	useSystemThemePreference,
} from '@pacto-chat/shared-ui-providers'

/**
 * ThemeProviderInternal manages the application's theme state and provides it to all child components.
 * It handles three scenarios:
 * 1. User explicitly selected theme (light/dark)
 * 2. System preference theme (follows OS settings)
 * 3. Initial load with system theme as default
 */
const ThemeProviderInternal = ({ children }: { children: React.ReactNode }) => {
	// Get the user's selected theme preference from persistent storage
	// Defaults to 'system' if no preference is stored
	const selectedTheme = useAtomValue(atomTheme)

	// Get the current system theme preference (light/dark)
	// Updates automatically when OS theme changes
	const systemTheme = useSystemThemePreference()

	// Determine the actual theme to apply:
	// - If user selected 'system', use the OS preference
	// - Otherwise, use the user's explicit selection
	const actualTheme = selectedTheme === 'system' ? systemTheme : selectedTheme

	return <Theme name={actualTheme}>{children}</Theme>
}

/**
 * ThemeProvider handle any loading states during theme initialization or changes
 */
export const ThemeProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	return <ThemeProviderInternal>{children}</ThemeProviderInternal>
}
