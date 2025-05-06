import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui, createTokens, setupDev } from 'tamagui'

import { animations } from './animations'
import { borderRadii } from './border_radii'
import { themes } from './colors'
import { fonts } from './fonts'
import { iconSizes } from './icon_sizes'
import { media, pageConstraints } from './media'
import { gap, spacing } from './spacing'
import { zIndices } from './z_indices'

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

export const tamaguiConfig = createTamagui({
	...defaultConfig,
	animations,
	fonts,
	media,
	shorthands: {}, // Disabled
	themes,
	tokens: createTokens({
		...defaultConfig.tokens,
		color: {
			true: themes.light.onSurface,
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
	settings: {
		defaultFont: 'body',
		// shouldAddPrefersColorThemes: true,
		// themeClassNameOnRoot: true,
	},
})

// For Babel in Expo app
export default tamaguiConfig

// export type CustomTamaguiConfigType = typeof tamaguiConfig
// declare module 'tamagui' {
// 	interface TamaguiCustomConfig extends CustomTamaguiConfigType {}
// }
