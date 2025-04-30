import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'
import React from 'react'

import { logExpoAuth } from '@pacto-chat/shared-utils-logging'

export default function AuthRoutesLayout() {
	const { isSignedIn } = useAuth()

	// Redirect to home if already signed in
	if (isSignedIn) {
		logExpoAuth.debug('Redirecting to home...')

		return <Redirect href='/' />
	}

	// Show the sign in page
	return <Stack screenOptions={{ headerShown: false }} />
}
