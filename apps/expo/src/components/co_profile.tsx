import { useUser } from '@clerk/clerk-expo'
import type React from 'react'
import { XStack, YStack, useMedia } from 'tamagui'

import { CoText } from '@pacto-chat/shared-ui-core/components'

interface CoProfileProps {
	onPress?: () => void
}

export const CoProfile: React.FC<CoProfileProps> = ({ onPress }) => {
	const { user } = useUser()
	const media = useMedia()

	// Get email and first letter
	const email = user?.emailAddresses[0]?.emailAddress || ''
	const firstLetter = email ? email.toUpperCase() : '?'

	// Responsive sizing
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
			aria-label={`Profile: ${email}`}
		>
			{isSmallScreen ? (
				<YStack
					width={size}
					height={size}
					borderRadius={size / 2}
					alignItems='center'
					justifyContent='center'
				>
					<CoText label-l color='$onSurfaceVariant'>
						{firstLetter}
					</CoText>
				</YStack>
			) : (
				<CoText label-m color='$onSurfaceVariant'>
					{email}
				</CoText>
			)}
		</XStack>
	)
}
