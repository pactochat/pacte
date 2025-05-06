import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'
import React from 'react'

import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoAuth } from '@pacto-chat/shared-utils-logging'

export default function AuthRoutesLayout() {
	const { isSignedIn } = useAuth()
	const { t } = useTranslation()

	// Redirect to home if already signed in
	if (isSignedIn) {
		logExpoAuth.debug('Redirecting to home...')
		return <Redirect href='/' />
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name='index'
				options={{
					title: t('pages.login.title'),
				}}
			/>
			<Stack.Screen
				name='verification'
				options={{
					title: t('pages.verification.title'),
				}}
			/>
		</Stack>
	)
}
