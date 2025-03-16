import { atomWithStorage, createJSONStorage } from 'jotai/utils'
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage'
import { useEffect, useState } from 'react'

import { ThemeName } from '@pacto-chat/shared-ui-core/theme'

const storage: SyncStorage<ThemeName> = createJSONStorage<ThemeName>(
	() => localStorage,
)

export const atomTheme = atomWithStorage<ThemeName>(
	'theme',
	ThemeName.system,
	storage,
)

export const useSystemThemePreference = () => {
	const [systemTheme, setSystemTheme] =
		useState<Exclude<ThemeName, 'system'>>('light')

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

		const handler = (e: MediaQueryListEvent) => {
			setSystemTheme(e.matches ? 'dark' : 'light')
		}

		mediaQuery.addEventListener('change', handler)
		return () => mediaQuery.removeEventListener('change', handler)
	}, [])

	return systemTheme
}
