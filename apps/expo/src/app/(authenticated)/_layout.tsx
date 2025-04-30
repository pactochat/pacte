import { useAuth } from '@clerk/clerk-expo'
import { Redirect, Stack } from 'expo-router'

import { logExpoAuth } from '@pacto-chat/shared-utils-logging'

export default function AuthenticatedLayout() {
	const { isSignedIn } = useAuth()

	// Redirect to login if not authenticated
	if (!isSignedIn) {
		logExpoAuth.debug('Redirecting to login...')

		return <Redirect href='/auth' />
	}

	// Show the authenticated layout
	return <Stack screenOptions={{ headerShown: false }} />
}
