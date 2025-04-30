'use client'

import '@tamagui/core/reset.css'
import '@tamagui/polyfill-dev'

import {
	type ColorScheme,
	NextThemeProvider,
	useRootTheme,
} from '@tamagui/next-theme'
import { useServerInsertedHTML } from 'next/navigation'
import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { TamaguiProvider } from 'tamagui'

import { tamaguiConfig } from '@pacto-chat/shared-ui-core/theme'

export const NextTamaguiProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useRootTheme()

	useServerInsertedHTML(() => {
		// @ts-ignore
		const rnwStyle = StyleSheet.getSheet()
		return (
			<>
				<style
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
					id={rnwStyle.id}
				/>
				<style
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: tamaguiConfig.getNewCSS(),
					}}
				/>
				<style jsx global>{`
					html {
						font-family: ${tamaguiConfig.fonts.body.family};
					}
				`}</style>
			</>
		)
	})

	return (
		<NextThemeProvider
			skipNextHead
			onChangeTheme={next => {
				setTheme(next as ColorScheme)
			}}
		>
			<TamaguiProvider
				config={{
					...tamaguiConfig,
					settings: { ...tamaguiConfig.settings, disableRootThemeClass: true },
				}}
				defaultTheme={theme}
			>
				{children}
			</TamaguiProvider>
		</NextThemeProvider>
	)
}
