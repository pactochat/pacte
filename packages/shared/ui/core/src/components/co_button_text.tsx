/**
 * Inspired in https://tamagui.dev/bento/elements/buttons
 */

import { cloneElement } from 'react'
import {
	AnimatePresence,
	ButtonFrame as ButtonFrameTamagui,
	Button as ButtonTamagui,
	type GetProps,
	Spinner,
	getTokenValue,
	styled,
} from 'tamagui'

import type { IconProps } from '../icons'
import { CoText } from './co_text'

/**
 * CoButtonText based on [Material Design](https://m3.material.io/styles/typography/)
 */
export const CoButtonText = ({
	children,
	fullWidth,
	icon,
	isLoading,
	...props
}: {
	children: string
	fullWidth?: boolean
	icon?: React.ReactElement<IconProps>
	isLoading?: boolean
} & BaseProps) => {
	const isDisabled =
		props.disabled ||
		props.filledDisabled ||
		props.filledTonalDisabled ||
		props.outlinedDisabled ||
		props.textDisabled

	return (
		<Base
			paddingVertical={isLoading ? '$spacingXs' : '$spacingSm'}
			paddingStart={isLoading ? '$spacingSm' : '$spacingMd'}
			fullWidth={fullWidth}
			{...props}
		>
			{!isDisabled && isLoading ? (
				<AnimatePresence>
					<Spinner
						animation='bouncy'
						enterStyle={{
							scale: 0,
						}}
						exitStyle={{
							scale: 0,
						}}
						size='small'
						marginEnd={'$gapSm'}
					/>
				</AnimatePresence>
			) : null}
			{icon && !isLoading ? (
				<ButtonTamagui.Icon>
					{cloneElement(icon, {
						size: getTokenValue('$iconSizes.iconLg', '$iconSizes'),
					})}
				</ButtonTamagui.Icon>
			) : null}
			<CoText label-l>{children}</CoText>
		</Base>
	)
}

// It doesn't use the same values as in Material Design guideline because it
// doesn't have the state layer.
const Base = styled(ButtonFrameTamagui, {
	name: 'CoButtonText',

	// Ensure the button shrinks to content and respects parent alignment
	display: 'inline-flex', // Shrink-wraps content (text, icon, spinner)
	width: 'auto', // Explicitly prevents stretching

	borderRadius: '$roundedMd',
	height: 'auto',
	paddingHorizontal: '$spacingMd',
	paddingVertical: '$spacingSm',
	space: '$spacingMd',
	userSelect: 'none',

	variants: {
		filled: {
			true: {
				backgroundColor: '$primaryContainer',
				color: '$onPrimaryContainer',
				hoverStyle: {
					backgroundColor: '$primaryContainer',
					opacity: 0.88,
				},
				pressStyle: {
					backgroundColor: '$primaryContainer',
					opacity: 0.76,
				},
			},
		},
		filledDisabled: {
			true: {
				opacity: 0.3,
				disabled: true,
			},
		},
		filledTonal: {
			true: {
				backgroundColor: '$secondaryContainer',
				color: '$onSecondaryContainer',
				hoverStyle: {
					backgroundColor: '$secondaryContainer',
					opacity: 0.92,
				},
				pressStyle: {
					backgroundColor: '$secondaryContainer',
					opacity: 0.84,
				},
			},
		},
		filledTonalDisabled: {
			true: {
				backgroundColor: '$secondaryContainer',
				color: '$onSecondaryContainer',
				opacity: 0.3,
				disabled: true,
			},
		},
		outlined: {
			true: {
				backgroundColor: 'transparent',
				borderWidth: 1,
				borderColor: '$primary',
				color: '$primary',
				hoverStyle: { backgroundColor: '$surfaceContainer' },
				pressStyle: { backgroundColor: '$surfaceContainerHigh' },
			},
		},
		outlinedDisabled: {
			true: {
				backgroundColor: 'transparent',
				borderWidth: 1,
				borderColor: '$surfaceContainerHighest',
				color: '$surfaceContainerHighest',
				disabled: true,
			},
		},
		text: {
			true: {
				backgroundColor: 'transparent',
				color: '$primary',
				hoverStyle: { backgroundColor: '$surfaceContainerHigh' },
				pressStyle: { backgroundColor: '$surfaceContainerHighest' },
			},
		},
		textDisabled: {
			true: {
				backgroundColor: 'transparent',
				color: '$primary',
				opacity: 0.4,
				disabled: true,
			},
		},
		fullWidth: {
			true: {
				width: '100%', // Takes full container width
				alignSelf: 'stretch',
			},
		},
		alignCenter: {
			true: { alignSelf: 'center' },
		},
		alignStart: {
			true: { alignSelf: 'flex-start' },
		},
		alignEnd: {
			true: { alignSelf: 'flex-end' },
		},
	} as const,

	defaultVariants: {
		alignStart: true,
		filled: true,
		fullWidth: false, // Default is not full-width
	},
})
type BaseProps = GetProps<typeof Base>
