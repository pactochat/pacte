import { useEffect, useState } from 'react'
import { AnimatePresence, View, XStack, styled } from 'tamagui'

import { IconX } from '../icons'
import { useTextDirectionality } from '../theme'
import { CoButtonIcon } from './co_button_icon'
import { CoText } from './co_text'

/**
 * Data structure for a toast notification
 * @internal
 */
interface ToastData {
	id: string
	text: string
	state?: 'info' | 'error'
	duration?: number
	autoDismiss?: boolean
}

// Toast controller to manage toasts
class ToastController {
	private static instance: ToastController
	private listeners: ((toast: ToastData | null) => void)[] = []
	private currentToast: ToastData | null = null
	private dismissTimer: NodeJS.Timeout | null = null

	private constructor() {}

	static getInstance(): ToastController {
		if (!ToastController.instance) {
			ToastController.instance = new ToastController()
		}
		return ToastController.instance
	}

	show(
		text: string,
		options: {
			state?: 'info' | 'error'
			duration?: number
			autoDismiss?: boolean
		} = {},
	) {
		// Clear any existing timer
		if (this.dismissTimer) {
			clearTimeout(this.dismissTimer)
			this.dismissTimer = null
		}

		this.currentToast = {
			id: Math.random().toString(36).substring(7),
			text,
			state: options.state ?? 'info',
			duration: options.duration ?? 5000, // Default 5 seconds
			autoDismiss: options.autoDismiss ?? true, // Default auto-dismiss enabled
		}

		this.notifyListeners()

		// Set up auto-dismiss if enabled
		if (this.currentToast.autoDismiss) {
			this.dismissTimer = setTimeout(() => {
				this.hide()
			}, this.currentToast.duration)
		}
	}

	hide() {
		// Clear any existing timer
		if (this.dismissTimer) {
			clearTimeout(this.dismissTimer)
			this.dismissTimer = null
		}

		this.currentToast = null
		this.notifyListeners()
	}

	subscribe(listener: (toast: ToastData | null) => void) {
		this.listeners.push(listener)
		return () => {
			this.listeners = this.listeners.filter(l => l !== listener)
		}
	}

	private notifyListeners() {
		for (const listener of this.listeners) {
			listener(this.currentToast)
		}
	}
}

/**
 * Hook to access the toast controller for showing notifications.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const toast = useToast()
 *
 *   const handleSuccess = () => {
 *     toast.show('Operation successful!', { state: 'info' })
 *   }
 *
 *   const handleError = () => {
 *     toast.show('Something went wrong', {
 *       state: 'error',
 *       duration: 5000, // Optional: custom duration in ms
 *       autoDismiss: true // Optional: auto-dismiss after duration
 *     })
 *   }
 *
 *   // Persistent toast that won't auto-dismiss
 *   const showPersistentToast = () => {
 *     toast.show('Important notification', {
 *       autoDismiss: false
 *     })
 *   }
 *
 *   return <Button onPress={handleSuccess}>Do something</Button>
 * }
 * ```
 */
export const useToast = () => {
	return ToastController.getInstance()
}

/**
 * Hook to access the current toast state.
 * For internal use by the CoToastViewport component.
 * @internal
 */
export const useToastState = () => {
	const [toast, setToast] = useState<ToastData | null>(null)

	useEffect(() => {
		const controller = ToastController.getInstance()
		return controller.subscribe(setToast)
	}, [])

	return toast
}

/**
 * Component that renders toast notifications.
 * Should be placed once at the root of your app or page.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <YourAppContent />
 *       <CoToastViewport /> // Place at the end of your root component
 *     </>
 *   )
 * }
 * ```
 */
export const CoToastViewport = () => {
	const toast = useToastState()
	const toastController = useToast()
	const startPosition = useTextDirectionality('left')

	if (!toast) return null

	// Calculate enter/exit positions based on text direction
	const enterX = startPosition === 'left' ? -20 : 20
	const exitX = startPosition === 'left' ? 20 : -20

	const handleClose = () => {
		toastController.hide()
	}

	return (
		<AnimatePresence>
			<PositionWrapper key={toast.id} place={startPosition}>
				<ToastContainer
					type={toast.state === 'error' ? 'error' : 'default'}
					animation='fast'
					enterStyle={{ opacity: 0, x: enterX }}
					exitStyle={{ opacity: 0, x: exitX }}
					x={0}
					opacity={1}
				>
					<XStack
						alignItems='center'
						gap='$gapMd'
						justifyContent='space-between'
						width='100%'
					>
						<CoText
							color={
								toast.state === 'error' ? '$onErrorContainer' : '$onSurface'
							}
							body-m
							numberOfLines={0}
							flexShrink={1}
						>
							{toast.text}
						</CoText>
						<CoButtonIcon
							icon={IconX}
							onPress={handleClose}
							{...(toast.state === 'error'
								? {
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
									}
								: { standard: true })}
							size={20}
						/>
					</XStack>
				</ToastContainer>
			</PositionWrapper>
		</AnimatePresence>
	)
}

// Positioning wrapper
const PositionWrapper = styled(View, {
	name: 'ToastPositionWrapper',

	position: 'absolute',
	top: '$spacingLg',
	zIndex: '$tooltip',

	variants: {
		place: {
			left: {
				left: '$spacingLg',
				right: 'auto',
			},
			right: {
				left: 'auto',
				right: '$spacingLg',
			},
		},
	} as const,
	defaultVariants: {
		place: 'left',
	},
})

/**
 * Styled container for toast notifications.
 * @internal
 */
const ToastContainer = styled(View, {
	name: 'CoToast',

	borderRadius: '$roundedSm',
	borderWidth: 1,
	display: 'flex',
	flexDirection: 'row',
	paddingHorizontal: '$spacingMd',
	paddingVertical: '$spacingSm',
	maxWidth: 300,
	shadowColor: '$outlineVariant',
	shadowRadius: 4,
	shadowOffset: { width: 0, height: 2 },
	shadowOpacity: 0.2,

	variants: {
		type: {
			error: {
				backgroundColor: '$errorContainer',
				borderColor: '$onErrorContainer',
			},
			default: {
				backgroundColor: '$surfaceContainerLow',
				borderColor: '$onSurface',
			},
		},
	} as const,
})
