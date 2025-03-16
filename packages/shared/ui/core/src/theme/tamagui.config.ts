import { defaultConfig } from '@tamagui/config/v4'
import { shorthands } from '@tamagui/shorthands'
import { createTamagui, createTokens, setupDev } from 'tamagui'

import { animations } from './animations.js'
import { borderRadii } from './border_radii.js'
import { themeDark, themeLight } from './colors.js'
import { fonts } from './fonts.js'
import { iconSizes } from './icon_sizes.js'
import { imageSizes } from './image_sizes.js'
import { media, pageConstraints } from './media.js'
import { gap, spacing } from './spacing.js'
import { zIndices } from './z_indices.js'

// Hold down Option for a second to see some helpful visuals
setupDev({
	visualizer: {
		key: 'Alt',
		delay: 800,
	},
})

export const ThemeName = {
	dark: 'dark',
	light: 'light',
	system: 'system',
} as const
export type ThemeName = keyof typeof ThemeName

const imageSize = { ...imageSizes, true: imageSizes.image40 }
const radius = {
	...defaultConfig.tokens.radius,
	...borderRadii,
	true: borderRadii.none,
}
const space = {
	...defaultConfig.tokens.space,
	...spacing,
	...gap,
	true: spacing.spacingSm,
}
const zIndex = {
	...defaultConfig.tokens.zIndex,
	...zIndices,
	true: zIndices.default,
}

const themes =
	process.env.TAMAGUI_TARGET !== 'web' ||
	process.env.TAMAGUI_IS_SERVER ||
	process.env.STORYBOOK
		? defaultConfig.themes
		: ({} as typeof defaultConfig.themes)

export const tamaguiConfig = createTamagui({
	...defaultConfig,
	...themes,
	animations,
	defaultFont: 'body',
	fonts,
	image: imageSize,
	media,
	shorthands,
	themes: {
		[ThemeName.light]: themeLight,
		[ThemeName.dark]: themeDark,
	},
	tokens: createTokens({
		...defaultConfig.tokens,
		color: {
			true: themeLight.onBackground,
		},
		iconSizes,
		radius,
		page: {
			...pageConstraints,
		},
		size: defaultConfig.tokens.size,
		space,
		zIndex,
	}),
	themeClassNameOnRoot: true,
})

// For Babel in Expo app
export default tamaguiConfig
