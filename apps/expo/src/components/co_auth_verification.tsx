import { useClerk, useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Data, Effect } from 'effect'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { showMessage } from 'react-native-flash-message'
import { XStack, YStack } from 'tamagui'

import {
	CoButtonText,
	CoText,
	CoTextField,
} from '@aipacto/shared-ui-core/components'
import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoComponents } from '@aipacto/shared-utils-logging'

class VerificationFailed extends Data.TaggedError('VerificationFailed') {}
class ClientStateInvalid extends Data.TaggedError('ClientStateInvalid') {}
class IdentifierNotFound extends Data.TaggedError('IdentifierNotFound') {}
class SessionTokenMissing extends Data.TaggedError('SessionTokenMissing') {}
class CodeResendFailed extends Data.TaggedError('CodeResendFailed') {}
class Unknown extends Data.TaggedError('Unknown') {}

interface AuthVerificationProps {
	email: string
	onResendCode: () => Effect.Effect<void>
	isSignUp?: boolean // Flag to determine if this is a sign-up or sign-in flow
}

export function CoAuthVerification({
	email,
	onResendCode,
	isSignUp = false, // Default to sign-in flow
}: AuthVerificationProps) {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const router = useRouter()
	const { t } = useTranslation()
	const { setActive } = useClerk()

	const [code, setCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [isResendCodeDisabled, setResendCodeDisabled] = useState(false)

	const handleVerify = () => {
		if (!isSignInLoaded || !isSignUpLoaded || loading) return

		setLoading(true)

		Effect.runPromise(
			Effect.gen(function* () {
				// Verify the code based on whether it's sign-in or sign-up
				if (isSignUp) {
					// Sign-up flow - Verify the email address for new account
					yield* Effect.tryPromise({
						try: () => signUp.attemptEmailAddressVerification({ code }),
						catch: error => {
							logExpoComponents.warn('Email verification failed', { error })
							return convertClerkError(error)
						},
					})

					logExpoComponents.debug('Email verification successful')
				} else {
					// Sign-in flow - Verify existing account
					yield* Effect.tryPromise({
						try: () =>
							signIn.attemptFirstFactor({
								strategy: 'email_code',
								code,
							}),
						catch: error => {
							logExpoComponents.warn('Sign-in verification failed', { error })
							return convertClerkError(error)
						},
					})

					logExpoComponents.debug('Sign-in verification successful')
				}

				// If successful, use the created session ID directly
				if (signIn.status === 'complete' && signIn.createdSessionId) {
					// Set the newly created session as active
					yield* Effect.tryPromise({
						try: () => setActive({ session: signIn.createdSessionId }),
						catch: () => new SessionTokenMissing(),
					})
				}

				// Navigate to the home screen after successful verification
				router.replace('/')
			}).pipe(
				Effect.catchTags({
					ClientStateInvalid: () => {
						showMessage({
							message: t('pages.login.err.restart_flow'),
							type: 'danger',
						})
						router.replace('/auth')
						return Effect.void
					},
					IdentifierNotFound: () => {
						showMessage({
							message: t(
								'components.co_auth_verification.err.verification_failed',
							),
							description: t('pages.login.err.restart_flow'),
							type: 'danger',
						})
						router.replace('/auth')
						return Effect.void
					},
					SessionTokenMissing: () => {
						showMessage({
							message: t(
								'components.co_auth_verification.err.verification_failed',
							),
							description: t('common.err.session_token_missing'),
							type: 'danger',
						})
						router.replace('/auth')
						return Effect.void
					},
					VerificationFailed: err => {
						showMessage({
							message: t(
								'components.co_auth_verification.err.verification_failed',
							),
							description: err.message,
							type: 'danger',
						})
						return Effect.void
					},
					Unknown: err => {
						showMessage({
							message: t(
								'components.co_auth_verification.err.verification_failed',
							),
							type: 'danger',
						})
						logExpoComponents.error('Unknown error during verification', {
							error: err,
						})
						return Effect.void
					},
				}),
				Effect.tap({
					onExit: () => setLoading(false),
				}),
			),
		)
	}

	const handleResendCode = () => {
		if (!isSignUpLoaded || isResendCodeDisabled) return

		setResendCodeDisabled(true)

		Effect.runPromise(
			Effect.gen(function* () {
				yield* Effect.tryPromise({
					try: () =>
						signUp.prepareEmailAddressVerification({ strategy: 'email_code' }),
					catch: error => {
						logExpoComponents.warn('Failed to resend verification code', {
							error,
						})
						return new CodeResendFailed()
					},
				})
				showMessage({
					message: t('components.co_auth_verification.txt.code_resent'),
					type: 'success',
				})
			}).pipe(
				Effect.catchTags({
					CodeResendFailed: () => {
						showMessage({
							message: t('components.co_auth_verification.err.resend_failed'),
							type: 'danger',
						})
						return Effect.void
					},
				}),
			),
		)

		// Disable resending code functionality for 15 seconds
		setTimeout(() => {
			setResendCodeDisabled(false)
		}, 15000)
	}

	return (
		<YStack gap='$gapLg' width='100%'>
			<YStack gap='$gapMd'>
				<CoText textAlign='center'>
					{t('components.co_auth_verification.txt.otc_in_email', { email })}
				</CoText>

				<CoTextField
					value={code}
					onChangeText={setCode}
					placeholder={t('components.co_auth_verification.plh.code')}
					keyboardType='number-pad'
					maxLength={6}
					disabled={loading}
				/>
			</YStack>

			<CoButtonText onPress={handleVerify} filled fullWidth isLoading={loading}>
				{t('components.co_auth_verification.btn.verify')}
			</CoButtonText>

			{/* Only show resend option for signup flow where it's functional */}
			{isSignUp && (
				<XStack gap='$gapXs'>
					<CoText>
						{t('components.co_auth_verification.txt.resend_code')}
					</CoText>
					<CoButtonText
						text
						onPress={handleResendCode}
						disabled={isResendCodeDisabled}
					>
						{t('components.co_auth_verification.btn.resend_code')}
					</CoButtonText>
				</XStack>
			)}
		</YStack>
	)
}

/**
 * Helper function to convert Clerk errors to our tagged errors
 */
const convertClerkError = (error: unknown) => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'errors' in error &&
		Array.isArray((error as any).errors)
	) {
		const clerkError = error as {
			errors: Array<{ code: string; message: string }>
		}
		const errorCode = clerkError.errors?.[0]?.code

		switch (errorCode) {
			case 'client_state_invalid':
				return new ClientStateInvalid()
			case 'form_identifier_not_found':
				return new IdentifierNotFound()
			default:
				return new VerificationFailed()
		}
	}
	return new Unknown()
}
