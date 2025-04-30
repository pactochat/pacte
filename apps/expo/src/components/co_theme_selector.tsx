import { View, XStack, YStack, styled } from 'tamagui'

import { CoText } from '@pacto-chat/shared-ui-core/components'
import { IconMonitor } from '@pacto-chat/shared-ui-core/icons'
import { type ThemeName, themes } from '@pacto-chat/shared-ui-core/theme'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { useTheme } from '~hooks'

const ThemeOption = styled(View, {
	name: 'CoThemeOption',

	backgroundColor: '$surface',
	borderRadius: '$roundedMd',
	borderWidth: 1,
	borderColor: '$outlineVariant',
	overflow: 'hidden',
	padding: '$spacingXs',
	cursor: 'pointer',

	hoverStyle: {
		backgroundColor: '$surfaceContainerHigh',
		borderColor: '$primary',
	},

	pressStyle: {
		backgroundColor: '$surfaceContainerHighest',
		borderColor: '$primary',
		opacity: 0.76,
	},

	variants: {
		selected: {
			true: {
				backgroundColor: '$surfaceContainerHighest',
				borderColor: '$primary',
				opacity: 0.76,
			},
		},
	},
})

const ThemePreview = styled(View, {
	name: 'ThemePreview',

	height: 60,
	borderRadius: '$roundedSm',
	overflow: 'hidden',
	marginBottom: '$spacingXs',
})

const SystemThemePreview = styled(View, {
	name: 'SystemThemePreview',

	height: 60,
	borderRadius: '$roundedSm',
	overflow: 'hidden',
	marginBottom: '$spacingXs',
	backgroundColor: '$surfaceContainerHighest',
	alignItems: 'center',
	justifyContent: 'center',
})

export const CoThemeSelector = () => {
	const { t } = useTranslation()
	const { currentTheme, resolvedTheme, setTheme } = useTheme()

	const themeColors = {
		light: {
			primary: themes.light.primary,
			secondary: themes.light.secondary,
			background: themes.light.background,
		},
		dark: {
			primary: themes.dark.primary,
			secondary: themes.dark.secondary,
			background: themes.dark.background,
		},
		system: {
			primary:
				resolvedTheme === 'dark' ? themes.dark.primary : themes.light.primary,
			secondary:
				resolvedTheme === 'dark'
					? themes.dark.secondary
					: themes.light.secondary,
			background:
				resolvedTheme === 'dark'
					? themes.dark.background
					: themes.light.background,
		},
	} as const

	// Available themes for selection
	const availableThemes: ThemeName[] = ['light', 'dark', 'system']

	return (
		<XStack gap='$gapMd' flexWrap='wrap' justifyContent='center'>
			{availableThemes.map(themeName => (
				<YStack key={themeName} flex={1} minWidth={80} maxWidth={120}>
					<ThemeOption
						selected={currentTheme === themeName}
						onPress={() => setTheme(themeName)}
						aria-label={t(`pages.settings.appearance.theme.${themeName}`)}
						aria-selected={currentTheme === themeName}
					>
						{themeName === 'system' ? (
							<SystemThemePreview>
								<IconMonitor color='$onSurface' />
							</SystemThemePreview>
						) : (
							<ThemePreview>
								<XStack height='100%'>
									<View
										flex={1}
										backgroundColor={themeColors[themeName].primary}
									/>
									<View
										flex={1}
										backgroundColor={themeColors[themeName].secondary}
									/>
								</XStack>
							</ThemePreview>
						)}
						<CoText
							textAlign='center'
							textTransform='capitalize'
							color={currentTheme === themeName ? '$primary' : '$onSurface'}
						>
							{t(`pages.settings.appearance.theme.${themeName}`)}
						</CoText>
					</ThemeOption>
				</YStack>
			))}
		</XStack>
	)
}
