import { useUser } from '@clerk/clerk-expo'
import type React from 'react'
import { XStack, YStack, useMedia } from 'tamagui'

import { CoText } from '@aipacto/shared-ui-core/components'

interface CoProfileProps {
	onPress?: () => void
}

/**
 * Displays a user profile component with the email or its first letter (on small screens).
 * Uses Clerk for user data and Tamagui for responsive styling.
 * @param onPress - Optional callback for when the profile is pressed.
 */
export const CoProfile: React.FC<CoProfileProps> = ({ onPress }) => {
	const { user } = useUser()
	const media = useMedia()

	// Get email and first letter (capitalized)
	const email = user?.emailAddresses[0]?.emailAddress || ''
	const firstLetter = email ? email.charAt(0).toUpperCase() : '?'

	// Responsive sizing based on screen size
	const isSmallScreen = media.sm
	const size = isSmallScreen ? 40 : 48

	return (
		<XStack
			backgroundColor='$surfaceContainer'
			borderRadius={size / 2}
			height={size}
			alignItems='center'
			justifyContent='center'
			paddingHorizontal={isSmallScreen ? '$spacingXs' : '$spacingMd'}
			onPress={onPress}
			aria-label={`Profile: ${email || 'Unknown'}`}
			// Support RTL with start-end alignment
			direction='ltr'
		>
			{isSmallScreen ? (
				<YStack
					width={size}
					height={size}
					borderRadius={size / 2}
					alignItems='center'
					justifyContent='center'
				>
					<CoText label-l color='$onSurfaceVariant' aria-hidden={false}>
						{firstLetter}
					</CoText>
				</YStack>
			) : (
				<CoText label-m color='$onSurfaceVariant' aria-hidden={false}>
					{email || 'Unknown'}
				</CoText>
			)}
		</XStack>
	)
}
