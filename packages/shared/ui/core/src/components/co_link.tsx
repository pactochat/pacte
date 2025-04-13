import type React from 'react'

import { Anchor, type TamaguiTextProps, isWeb, styled } from '../theme'

interface LinkProps extends TamaguiTextProps {
	children: React.ReactNode
	href?: string
	onPress?: () => void
}

export const CoLink = ({
	href,
	onPress,
	children,
	disabled,
	...props
}: LinkProps) => (
	<StyledAnchor
		color='$onBackground'
		// Syntax conditionally includes the href prop only when href is defined and disabled is false.
		// It ensures that href is either a string or completely omitted.
		{...(!disabled && href ? { href } : {})}
		{...(!disabled && href && isWeb ? { rel: 'noopener noreferrer' } : {})}
		onPress={disabled ? undefined : onPress}
		{...(!disabled && href && isWeb ? { target: '_blank' } : {})}
		disabled={disabled}
		{...props}
	>
		{children}
	</StyledAnchor>
)

const StyledAnchor = styled(Anchor, {
	name: 'CoLink',

	cursor: 'pointer',
	textDecorationLine: 'underline',

	variants: {
		disabled: {
			true: {
				opacity: 0.5,
				pointerEvents: 'none',
			},
		},
	},
})
