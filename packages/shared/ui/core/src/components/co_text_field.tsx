import { forwardRef, useEffect, useRef, useState } from 'react'
import {
	type GetProps,
	Input as TamaguiInput,
	XStack,
	YStack,
	styled,
} from 'tamagui'

import { useDirection } from '@tamagui/use-direction'
import { IconCircleX } from '../icons'
import { CoText } from './co_text'

/**
 * CoTextField component based on Material Design v3 guidelines
 */
export const CoTextField = forwardRef<any, CoTextFieldProps>(
	(
		{
			onFocus,
			onBlur,
			label,
			required,
			error,
			errorMessage,
			supportingText,
			...props
		},
		ref,
	) => {
		const [isFocused, setIsFocused] = useState(false)
		const [hasValue, setHasValue] = useState(false)
		const inputRef = useRef<any>(null)

		// Use a combined ref to maintain the original ref functionality
		const combinedRef = (instance: any) => {
			// Update the forwarded ref if it exists
			if (typeof ref === 'function') {
				ref(instance)
			} else if (ref) {
				ref.current = instance
			}
			// Store the ref locally
			inputRef.current = instance
		}

		// Maintain focus after validation rerenders
		useEffect(() => {
			if (isFocused && inputRef.current) {
				// This ensures we keep focus on the input after a rerender
				inputRef.current.focus()
			}
		}, [isFocused, error, hasValue])

		useEffect(() => {
			if (props.value) {
				setHasValue(!!props.value)
			}
		}, [props.value])

		return (
			<YStack gap='$gapXs'>
				<XStack
					position='relative'
					alignItems='center'
					backgroundColor='$surface'
					borderRadius='$roundedMd'
					borderWidth={1}
					borderColor={
						error && hasValue ? '$error' : isFocused ? '$primary' : '$outline'
					}
					paddingVertical='$spacingSm'
					paddingHorizontal='$spacingSm'
					height={56}
				>
					{label && (
						<CoText
							position='absolute'
							left='$spacingMd'
							top={isFocused || hasValue ? -8 : 16}
							backgroundColor='$surface'
							paddingHorizontal='$spacingXs'
							color={
								error && hasValue
									? '$error'
									: isFocused
										? '$primary'
										: '$onSurfaceVariant'
							}
							animation='medium'
							scale={isFocused || hasValue ? 0.8 : 1}
							label-m
						>
							{label}
							{required && '*'}
						</CoText>
					)}
					<StyledInput
						{...props}
						ref={combinedRef}
						focused={isFocused}
						hasValue={hasValue}
						onFocus={e => {
							setIsFocused(true)
							onFocus?.(e)
						}}
						onBlur={e => {
							setIsFocused(false)
							onBlur?.(e)
						}}
						onChangeText={text => {
							setHasValue(!!text)
							props.onChangeText?.(text)
						}}
						accessibilityLabel={
							label ? `${label}${required ? ' required' : ''}` : undefined
						}
					/>
					{error && hasValue && (
						<IconCircleX
							size='$iconSm'
							color='$error'
							marginStart='$spacingXs'
							position='absolute'
							right={useDirection() === 'rtl' ? '$spacingMd' : 'auto'}
							left={useDirection() === 'rtl' ? 'auto' : '$spacingMd'}
						/>
					)}
				</XStack>
				{hasValue && (error ? errorMessage : supportingText) && (
					<CoText
						color={error ? '$error' : '$onSurfaceVariant'}
						body-s
						paddingStart='$spacingMd'
					>
						{error ? errorMessage : supportingText}
					</CoText>
				)}
			</YStack>
		)
	},
)

const StyledInput = styled(TamaguiInput, {
	name: 'CoTextField',

	borderWidth: 0,
	backgroundColor: 'transparent',
	color: '$onSurface',
	paddingVertical: '$spacingSm',
	paddingHorizontal: '$spacingXs',
	width: '100%',

	variants: {
		focused: {
			true: {
				color: '$onSurface',
			},
		},
		disabled: {
			true: {
				color: '$onSurfaceVariant',
				pointerEvents: 'none',
			},
		},
		hasValue: {
			true: {
				paddingTop: '$spacingMd',
			},
		},
	} as const,

	defaultVariants: {
		focused: false,
		disabled: false,
		hasValue: false,
	},
})

type CoTextFieldProps = GetProps<typeof StyledInput> & {
	label?: string
	required?: boolean | undefined
	error?: boolean | undefined
	errorMessage?: string | undefined
	supportingText?: string | undefined
}
