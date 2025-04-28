/**
 * CoParagraph component based on Tamagui Paragraph
 * https://tamagui.dev/docs/components/text
 */

import type { AccessibilityRole } from 'react-native'
import { Text, type TextProps, isWeb, styled } from 'tamagui'

type CoParagraphProps = {
	lowercase?: boolean
	select?: false
	truncate?: boolean
	uppercase?: boolean
	wrap?: false
} & TextProps

/**
 * CoParagraph component for paragraph text
 */
export const CoParagraph = (props: CoParagraphProps) => (
	<Base
		{...props}
		color={props.color ?? '$onSurface'}
		// For RN compatibility, use 'accessibilityRole' instead of 'role'
		{...(isWeb ? {} : { accessibilityRole: props.role as AccessibilityRole })}
	/>
)

const Base = styled(Text, {
	name: 'CoParagraph',
	tag: 'p',

	whiteSpace: 'normal',

	variants: {
		'body-l': {
			true: {
				fontFamily: '$body',
				fontSize: '$body-l',
				fontWeight: '400',
				letterSpacing: '$body-l',
				tag: 'p',
			},
		},
		'body-m': {
			true: {
				fontFamily: '$body',
				fontSize: '$body-m',
				fontWeight: '400',
				letterSpacing: '$body-m',
				tag: 'p',
			},
		},
		bold: {
			true: {
				fontWeight: '700',
			},
		},
		lowercase: {
			true: {
				textTransform: 'lowercase',
			},
		},
		uppercase: {
			true: {
				textTransform: 'uppercase',
			},
		},
		wrap: {
			false: {
				whiteSpace: 'nowrap',
			},
		},
		ellipsis: {
			true: {
				ellipsis: true,
			},
		},
	} as const,

	defaultVariants: {
		'body-m': true,
	},
})
