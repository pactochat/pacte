import { useAuth, useSignIn, useSignUp } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { showMessage } from 'react-native-flash-message'
import { XStack, YStack } from 'tamagui'

import {
	CoButtonText,
	CoText,
	CoTextField,
} from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoAuth } from '@pacto-chat/shared-utils-logging'

const codeSize = 6

interface AuthVerificationProps {
	email: string
	onResendCode: () => void
	isSignUp?: boolean // Flag to determine if this is a sign-up or sign-in flow
	redirectTo?: string | undefined // Where to redirect after successful verification
}

export function AuthVerification({
	email,
	onResendCode,
	isSignUp = false, // Default to sign-in flow
	redirectTo = '/', // Default to home route
}: AuthVerificationProps) {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const { getToken } = useAuth()
	const router = useRouter()
	const { t } = useTranslation()

	const [code, setCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [isResendCodeDisabled, setResendCodeDisabled] = useState(false)

	const handleVerify = async () => {
		if (!isSignInLoaded || !isSignUpLoaded || loading) return

		try {
			setLoading(true)

			if (isSignUp) {
				// Sign-up flow - Verify the email address for new account
				await signUp.attemptEmailAddressVerification({
					code,
				})
			} else {
				// Sign-in flow - Verify existing account
				await signIn.attemptFirstFactor({
					strategy: 'email_code',
					code,
				})
			}

			// Get the session token
			const token = await getToken()
			if (!token) {
				throw new Error('Failed to get session token')
			}

			// Navigate based on redirectTo parameter
			router.replace(redirectTo as any)
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

			// Handle form_identifier_not_found - if using wrong flow
			if (err?.errors?.[0]?.code === 'form_identifier_not_found' && !isSignUp) {
				// We thought it was a sign-in but it's actually a new user
				// Should redirect to signup or handle differently
				showMessage({
					message: t('pages.login_verification.err.verification_failed'),
					description: t('pages.login.err.restart_flow'),
					type: 'danger',
				})
				router.replace('/auth')
				return
			}

			showMessage({
				message: t('pages.login_verification.err.verification_failed'),
				description:
					err?.errors?.[0]?.message ||
					t('pages.login_verification.err.verification_failed'),
				type: 'danger',
			})
		} finally {
			setLoading(false)
		}
	}

	const handleResendCode = async () => {
		if (isResendCodeDisabled) return

		try {
			setResendCodeDisabled(true)

			// Disable resending code functionality for 15 seconds
			setTimeout(() => {
				setResendCodeDisabled(false)
			}, 15000)

			// Call the parent's resend code handler
			await onResendCode()

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
		}
	}

	return (
		<YStack gap='$gapLg' width='100%'>
			<YStack gap='$gapMd'>
				<CoText textAlign='center'>
					{t('pages.login_verification.txt.otc_in_email', { email })}
				</CoText>

				<CoTextField
					value={code}
					onChangeText={setCode}
					placeholder={t('pages.login_verification.plh.code')}
					keyboardType='number-pad'
					maxLength={codeSize}
					disabled={loading}
				/>
			</YStack>

			<CoButtonText onPress={handleVerify} filled fullWidth isLoading={loading}>
				{t('pages.login_verification.btn.verify')}
			</CoButtonText>

			{/* Only show resend option for signup flow where it's functional */}
			{isSignUp && (
				<XStack gap='$gapXs'>
					<CoText>{t('pages.login_verification.txt.resend_code')}</CoText>
					<CoButtonText
						text
						onPress={handleResendCode}
						disabled={isResendCodeDisabled}
					>
						{t('pages.login_verification.btn.resend_code')}
					</CoButtonText>
				</XStack>
			)}
		</YStack>
	)
}
