import { useAuth, useUser } from '@clerk/clerk-expo'
import { useEffect, useState } from 'react'
import type React from 'react'
import { ActivityIndicator, View } from 'react-native'

import { ListSupportedLanguagesCodes } from '@pacto-chat/shared-domain'
import {
	changeLanguage,
	detectLanguage,
	initI18n,
} from '@pacto-chat/shared-ui-localization'
import { logAppExpo } from '@pacto-chat/shared-utils-logging'

export function LocalizationProvider({
	children,
}: { children: React.ReactNode }) {
	const { isSignedIn } = useAuth()
	const { user, isLoaded: isUserLoaded } = useUser()
	const [isLocalizationReady, setIsLocalizationReady] = useState(false)

	useEffect(() => {
		const init = async () => {
			try {
				// Default to device language
				let userLanguage = detectLanguage()
				let userMetadata = null

				// If signed in and user is loaded, check for language preference
				if (isSignedIn && isUserLoaded && user) {
					// Simply use the user's metadata
					userMetadata = {
						// Include user metadata
						unsafe_metadata: user.unsafeMetadata,
						public_metadata: user.publicMetadata,
						// Also add the language directly if it exists in unsafeMetadata
						language: user.unsafeMetadata?.language || null,
					}

					// Check if language exists in unsafeMetadata
					const preferredLanguage = user.unsafeMetadata?.language as
						| string
						| undefined

					if (
						preferredLanguage &&
						Object.keys(ListSupportedLanguagesCodes).includes(preferredLanguage)
					) {
						userLanguage = preferredLanguage as ListSupportedLanguagesCodes
						logAppExpo.debug('Using user preferred language from metadata', {
							language: userLanguage,
						})
					}
				}

				// Initialize i18n with user metadata
				await initI18n(userMetadata)

				// Explicitly set language if we detected it from metadata
				if (userLanguage && userLanguage !== 'eng') {
					await changeLanguage(userLanguage)
				}

				setIsLocalizationReady(true)
			} catch (error) {
				logAppExpo.error('Failed to initialize i18n', { error })
				setIsLocalizationReady(true) // Still mark as ready to avoid blocking the UI
			}
		}

		// Only initialize when user data is loaded or if user isn't signed in
		if (!isSignedIn || isUserLoaded) {
			init()
		}
	}, [isSignedIn, isUserLoaded, user])

	if (!isLocalizationReady) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size='large' />
			</View>
		)
	}

	return <>{children}</>
}
