import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { showMessage } from 'react-native-flash-message'

import { CoButtonText } from '@pacto-chat/shared-ui-core/components'
import { logExpoAuthComponents } from '@pacto-chat/shared-utils-logging'

interface ButtonSignOutProps {
	variant?: 'filled' | 'filledTonal' | 'outlined' | 'text'
	fullWidth?: boolean
}

export function ButtonSignOut({
	variant = 'filled',
	fullWidth = false,
}: ButtonSignOutProps) {
	const { signOut } = useClerk()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const handleSignOut = async () => {
		try {
			setIsLoading(true)

			await signOut()

			router.replace('/auth')
		} catch (error) {
			logExpoAuthComponents.error('Error signing out:', error)

			showMessage({
				message: 'Sign out failed',
				description: 'There was an error signing out. Please try again.',
				type: 'danger',
			})
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<CoButtonText
			onPress={handleSignOut}
			isLoading={isLoading}
			filled={variant === 'filled'}
			filledTonal={variant === 'filledTonal'}
			outlined={variant === 'outlined'}
			text={variant === 'text'}
			fullWidth={fullWidth}
		>
			Sign Out
		</CoButtonText>
	)
}
