import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'
import React from 'react'

import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoAuth } from '@aipacto/shared-utils-logging'

export default function AuthenticatedLayout() {
	const { isSignedIn } = useAuth()
	const { t } = useTranslation()

	// Redirect to login if not authenticated
	if (!isSignedIn) {
		logExpoAuth.debug('Redirecting to login...')
		return <Redirect href='/auth' />
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name='index'
				options={{
					title: 'Chat',
				}}
			/>
			<Stack.Screen
				name='Settings'
				options={{
					title: t('pages.settings.title'),
				}}
			/>
		</Stack>
	)
}
