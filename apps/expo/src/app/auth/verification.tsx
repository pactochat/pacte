import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Effect, Match } from 'effect'
import { router, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { showMessage } from 'react-native-flash-message'

import { CoPage } from '@aipacto/shared-ui-core/components'
import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoAuth } from '@aipacto/shared-utils-logging'
import { CoAuthVerification } from '~components'

export default function AuthVerificationScreen() {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const router = useRouter()
	const { t } = useTranslation()
	const { email, isSignUp: isSignUpParam } = useLocalSearchParams<{
		email: string
		isSignUp: string
		redirectTo?: string
	}>()

	// Convert string param to boolean
	const isSignUp = isSignUpParam === 'true'

	const [loading, setLoading] = useState(false)

	const handleResendCode = () => {
		return Effect.gen(function* () {
			if (
				(!isSignInLoaded && !isSignUp) ||
				(!isSignUpLoaded && isSignUp) ||
				loading
			)
				return Effect.void

			setLoading(true)

			// Only support resend for sign-up flow
			if (isSignUp && signUp) {
				const result = Effect.tryPromise(() =>
					signUp.prepareEmailAddressVerification(),
				).pipe(
					Effect.flatMap(result => {
						logExpoAuth.debug('Email address verification prepared', {
							result,
						})

						showMessage({
							message: t('pages.verification.msg.code_resent'),
							type: 'success',
						})
						return Effect.void
					}),
					Effect.catchAll(err => {
						logExpoAuth.warn('Error resending code', { error: err })

						const errorCode =
							typeof err === 'object' &&
							err !== null &&
							'errors' in err &&
							Array.isArray((err as any).errors)
								? (err as any).errors?.[0]?.code
								: undefined

						Match.value(errorCode).pipe(
							Match.when('client_state_invalid', () => {
								showMessage({
									message: t('pages.login.err.restart_flow'),
									type: 'danger',
								})
								router.replace('/auth')
							}),
							Match.orElse(() => {
								showMessage({
									message: t('pages.verification.err.resend_failed'),
									type: 'danger',
								})
							}),
						)
						// return Effect.fail('invalid_email')
						return Effect.void
					}),
				)
				return result
			}

			return Effect.void
		})
	}

	if (!email) {
		router.replace('/auth')
		return null
	}

	return (
		<CoPage
			title={t('pages.verification.title')}
			narrow='small'
			centered='both'
		>
			<CoAuthVerification
				email={email}
				onResendCode={handleResendCode}
				isSignUp={isSignUp}
			/>
		</CoPage>
	)
}
