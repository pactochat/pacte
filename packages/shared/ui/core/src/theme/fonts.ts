import { createFont, isWeb } from 'tamagui'

export const fontSize = {
	'display-m': 38,
	'display-s': 34,
	'heading-l': 30,
	'heading-m': 26,
	title: 22,
	'body-l': 16,
	'body-m': 14,
	'label-l': 14,
	'label-m': 12,
} as const

const dmSans = createFont({
	family: isWeb ? '"DM Sans", sans-serif' : 'System',

	size: {
		'display-m': 38,
		'display-s': 34,
		'heading-l': 30,
		'heading-m': 26,
		title: 22,
		'body-l': 16,
		'body-m': 14,
		'label-l': 14,
		'label-m': 12,
	},

	lineHeight: {
		'display-m': 1.2,
		'display-s': 1.2,
		'heading-l': 1.3,
		'heading-m': 1.3,
		title: 1.25,
		'body-l': 1.6,
		'body-m': 1.6,
		'label-l': 1.4,
		'label-m': 1.4,
	},

	letterSpacing: {
		'display-m': -0.02,
		'display-s': -0.015,
		'heading-l': -0.01,
		'heading-m': -0.01,
		title: 0,
		'body-l': 0.015,
		'body-m': 0.02,
		'label-l': 0.01,
		'label-m': 0.02,
	},

	// Remember to update the font-weight in the index.html file and Expo app.
	weight: {
		400: 'DMSans',
		500: 'DMSansMedium',
		700: 'DMSansBold',
	},

	// For native platforms, specify different font files based on weight and style
	face: {
		400: { normal: 'DMSans', italic: 'DMSansItalic' },
		500: { normal: 'DMSansMedium', italic: 'DMSansMediumItalic' },
		700: { normal: 'DMSansBold', italic: 'DMSansBoldItalic' },
	},
})

const literata = createFont({
	family: isWeb ? '"Literata", Georgia, serif' : 'System',

	size: {
		'display-m': 38,
		'display-s': 34,
		'heading-l': 30,
		'heading-m': 26,
		title: 22,
		'body-l': 16,
		'body-m': 14,
		'label-l': 14,
		'label-m': 12,
	},

	lineHeight: {
		'display-m': 1.2,
		'display-s': 1.2,
		'heading-l': 1.3,
		'heading-m': 1.3,
		title: 1.25,
		'body-l': 1.6,
		'body-m': 1.6,
		'label-l': 1.4,
		'label-m': 1.4,
	},

	letterSpacing: {
		'display-m': -0.02,
		'display-s': -0.015,
		'heading-l': -0.01,
		'heading-m': -0.01,
		title: 0,
		'body-l': 0.015,
		'body-m': 0.02,
		'label-l': 0.01,
		'label-m': 0.02,
	},

	// Remember to update the font-weight in the index.html file and Expo app.
	weight: {
		400: 'Literata',
		500: 'LiterataMedium',
		700: 'LiterataBold',
	},

	// For native platforms, specify different font files based on weight and style
	face: {
		400: { normal: 'Literata', italic: 'LiterataItalic' },
		500: { normal: 'LiterataMedium', italic: 'LiterataMediumItalic' },
		700: { normal: 'LiterataBold', italic: 'LiterataBoldItalic' },
	},
})

/**
 * Defines the font configurations used in the Tamagui theme.
 * Tamagui requires `body` and `heading` font families to be defined.
 * You can customize these or add additional fonts for use in components.
 * More info: https://tamagui.dev/docs/core/configuration
 *
 * @example
 * <Text fontFamily="$body">This is body font</Text>
 * <Text fontFamily="$custom1">This is custom font</Text>
 */
export const fonts = {
	body: dmSans, // Default for Tamagui components
	content: literata,
	// heading: dmSans, // Default for Tamagui components
	heading: literata,
}
