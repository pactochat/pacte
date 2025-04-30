import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import { showMessage } from 'react-native-flash-message'

import { CoPage } from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoAuth } from '@pacto-chat/shared-utils-logging'
import { AuthVerification } from '~components'

export default function AuthVerificationScreen() {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const router = useRouter()
	const { t } = useTranslation()
	const {
		email,
		isSignUp: isSignUpParam,
		redirectTo,
	} = useLocalSearchParams<{
		email: string
		isSignUp: string
		redirectTo?: string
	}>()

	// Convert string param to boolean
	const isSignUp = isSignUpParam === 'true'

	const [loading, setLoading] = useState(false)

	const handleResendCode = async () => {
		if (
			(!isSignInLoaded && !isSignUp) ||
			(!isSignUpLoaded && isSignUp) ||
			loading
		)
			return

		try {
			setLoading(true)

			// Only support resend for sign-up flow
			if (isSignUp && signUp) {
				await signUp.prepareEmailAddressVerification()
			}

			showMessage({
				message: t('pages.login_verification.msg.code_resent'),
				type: 'success',
			})
		} catch (err: any) {
			logExpoAuth.warn(JSON.stringify(err, null, 2))

			// Handle client_state_invalid error by redirecting to login
			if (err?.errors?.[0]?.code === 'client_state_invalid') {
				showMessage({
					message: t('pages.login.err.restart_flow'),
					type: 'danger',
				})
				router.replace('/auth')
				return
			}

			showMessage({
				message: t('pages.login_verification.err.resend_failed'),
				description:
					err?.errors?.[0]?.message ||
					t('pages.login_verification.err.resend_failed'),
				type: 'danger',
			})
		} finally {
			setLoading(false)
		}
	}

	if (!email) {
		router.replace('/auth')
		return null
	}

	return (
		<CoPage
			title={t('pages.login_verification.title')}
			narrow='small'
			centered='both'
		>
			<AuthVerification
				email={email}
				onResendCode={handleResendCode}
				isSignUp={isSignUp}
				redirectTo={redirectTo as string | undefined}
			/>
		</CoPage>
	)
}
