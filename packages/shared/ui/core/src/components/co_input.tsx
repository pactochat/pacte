import { forwardRef } from 'react'

import { type TamaguiGetProps, Input as TamaguiInput, styled } from '../theme'

/**
 * CoInput component based on Material Design v3 guidelines
 */
export const CoInput = forwardRef<any, CoInputProps>(({ ...props }, ref) => {
	return <StyledInput {...props} ref={ref} />
})

const StyledInput = styled(TamaguiInput, {
	name: 'CoInput',

	borderRadius: '$roundedMd',
	paddingVertical: '$spacingXs',
	paddingHorizontal: '$spacingSm',
	borderWidth: 1,
	borderColor: '$outline',
	backgroundColor: '$surface',
	color: '$onSurface',

	variants: {
		focused: {
			true: {
				borderColor: '$primary',
				backgroundColor: '$surface',
				color: '$onSurface',
			},
		},
		disabled: {
			true: {
				borderColor: '$outlineVariant',
				backgroundColor: '$surfaceVariant',
				color: '$onSurfaceVariant',
				pointerEvents: 'none',
			},
		},
		error: {
			true: {
				borderColor: '$error',
				backgroundColor: '$surface',
			},
		},
	} as const,

	defaultVariants: {
		focused: false,
		disabled: false,
		error: false,
	},
})

type CoInputProps = TamaguiGetProps<typeof StyledInput>
