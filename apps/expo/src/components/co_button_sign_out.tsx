import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { showMessage } from 'react-native-flash-message'

import { CoButtonText } from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoAuthComponents } from '@pacto-chat/shared-utils-logging'

export function CoButtonSignOut() {
	const { t } = useTranslation()
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
				message: t('pages.settings.account.msg.sign_out_failed'),
				description: t(
					'pages.settings.account.msg.sign_out_failed_description',
				),
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
			outlined
			fullWidth
		>
			{t('pages.settings.account.btn.sign_out')}
		</CoButtonText>
	)
}
