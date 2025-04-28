/**
 * Inspired in https://github.com/status-im/status-web/blob/main/packages/components/src/icon-button/icon-button.tsx
 * https://tamagui.dev/bento/elements/buttons
 */

import type { ComponentType } from 'react'
import { Button as ButtonTamagui, type GetProps, styled } from 'tamagui'

import type { IconProps } from '../icons'

export const CoButtonIcon = ({
	icon: Icon,
	color,
	backgroundColor,
	...props
}: {
	icon: ComponentType<IconProps>
	color?: string
	backgroundColor?: string
} & BaseProps) => {
	return (
		<Base {...props} circular={true} backgroundColor={backgroundColor}>
			<ButtonTamagui.Icon>
				<Icon size={24} color={color || 'inherit'} />
			</ButtonTamagui.Icon>
		</Base>
	)
}

const Base = styled(ButtonTamagui, {
	name: 'CoButtonIcon',

	size: 40,

	variants: {
		filled: {
			true: {
				backgroundColor: '$primary',
				color: '$onPrimary',
				hoverStyle: {
					backgroundColor: '$primary',
					opacity: 0.88,
				},
				pressStyle: {
					backgroundColor: '$primary',
					opacity: 0.76,
				},
			},
		},
		filledDisabled: {
			true: {
				backgroundColor: '$onSurface',
				color: '$surface',
				opacity: 0.12,
				pointerEvents: 'none',
			},
		},
		filledTonal: {
			true: {
				backgroundColor: '$secondaryContainer',
				color: '$onSecondaryContainer',
				hoverStyle: {
					backgroundColor: '$secondaryContainer',
					opacity: 0.88,
				},
				pressStyle: {
					backgroundColor: '$secondaryContainer',
					opacity: 0.76,
				},
			},
		},
		filledTonalDisabled: {
			true: {
				backgroundColor: '$onSurface',
				color: '$surface',
				opacity: 0.12,
				pointerEvents: 'none',
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
				pointerEvents: 'none',
			},
		},
		standard: {
			true: {
				backgroundColor: 'transparent',
				color: '$primary',
				hoverStyle: { backgroundColor: '$surfaceContainerHigh' },
				pressStyle: { backgroundColor: '$surfaceContainerHighest' },
			},
		},
		danger: {
			true: {
				backgroundColor: '$error',
				color: '$onError',
				hoverStyle: {
					backgroundColor: '$error',
					opacity: 0.88,
				},
				pressStyle: {
					backgroundColor: '$error',
					opacity: 0.76,
				},
			},
		},
		disabled: {
			true: {
				backgroundColor: 'transparent',
				color: '$onSurface',
				opacity: 0.12,
				pointerEvents: 'none',
			},
		},
	} as const,
	defaultVariants: {
		standard: true,
	},
})
type BaseProps = GetProps<typeof Base>
