/**
 * Inspired in https://github.com/status-im/status-web/blob/main/packages/components/src/icon-button/icon-button.tsx
 * https://tamagui.dev/bento/elements/buttons
 */

import type { ComponentType } from 'react'

import type { IconProps } from '../icons'
import { Button as ButtonTamagui, type TamaguiGetProps, styled } from '../theme'

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
	// cursor: "pointer",
	// userSelect: "none",
	// borderRadius: "$10",
	// display: "flex",
	// alignItems: "center",
	// justifyContent: "center",
	// padding: 4,
	// width: 40,
	// height: 40,
	// borderWidth: 1,
	// borderColor: "transparent",
	// animation: "fast",

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
type BaseProps = TamaguiGetProps<typeof Base>
