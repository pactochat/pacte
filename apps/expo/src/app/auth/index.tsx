import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Effect, Schema } from 'effect'
import { useRouter } from 'expo-router'
import React, { useCallback, useRef, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { showMessage } from 'react-native-flash-message'
import { YStack } from 'tamagui'

import { Email } from '@pacto-chat/shared-domain'
import {
	CoButtonText,
	CoCard,
	CoPage,
	CoText,
	CoTextField,
} from '@pacto-chat/shared-ui-core/components'
import { useTranslation } from '@pacto-chat/shared-ui-localization'
import { logExpoPagesAuth } from '@pacto-chat/shared-utils-logging'

const log = logExpoPagesAuth.getChildCategory('login')

type FormValues = {
	email: string
}

export default function LoginScreen() {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const router = useRouter()
	const { t } = useTranslation()
	const [loading, setLoading] = React.useState(false)

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		setError,
	} = useForm<FormValues>({
		defaultValues: {
			email: '',
		},
		mode: 'onChange',
	})

	// Refs for focus management
	const inputRef = useRef<any>(null)
	const wasFocusedRef = useRef(false)

	const validateEmail = useCallback((value: string) => {
		return Effect.runSync(
			Schema.decode(Email)(value).pipe(
				Effect.map(() => true),
				Effect.catchAll(() => Effect.succeed(false)),
			),
		)
	}, [])

	const emailValidator = useCallback(
		(value: string) => {
			if (!value) return false
			return validateEmail(value)
		},
		[validateEmail],
	)

	const onSubmit = async (data: FormValues) => {
		if (!isSignInLoaded || !isSignUpLoaded) return

		log.debug(`Attempting authentication for email: ${data.email}`)
		setLoading(true)

		// Track if we're in signup flow
		let isSigningUp = false

		try {
			if (!validateEmail(data.email)) {
				setError('email', {
					type: 'validate',
				})
				setLoading(false)
				return
			}

			try {
				await signIn.create({
					identifier: data.email,
					strategy: 'email_code',
				})
			} catch (err: any) {
				if (err?.errors?.[0]?.code === 'form_identifier_not_found') {
					log.debug(`No account found, attempting sign up for ${data.email}`)
					isSigningUp = true

					await signUp.create({
						emailAddress: data.email,
					})

					await signUp.prepareEmailAddressVerification()
				} else {
					throw err
				}
			}

			// Pass isSignUp parameter in the route to indicate which flow we're in
			router.push({
				pathname: '/auth/verification',
				params: {
					email: data.email,
					isSignUp: isSigningUp ? 'true' : 'false',
					redirectTo: '/', // Default redirect to home
				},
			})

			log.debug(`Authentication verification initiated for ${data.email}`)
		} catch (err) {
			log.error(`Authentication error for ${data.email}`, err)
			showMessage({
				message: t('pages.login.err.login_failed'),
				type: 'danger',
			})
		} finally {
			setLoading(false)
		}
	}

	// Restore focus after rerender due to validation
	useEffect(() => {
		if (
			wasFocusedRef.current &&
			inputRef.current &&
			!inputRef.current.isFocused()
		) {
			inputRef.current.focus()
		}
	}, [errors.email])

	return (
		<CoPage narrow='small' centered='both'>
			<CoCard>
				<CoCard.Title>{t('pages.login.title')}</CoCard.Title>
				<CoCard.Content>
					<YStack gap='$gapLg' width='100%'>
						<YStack gap='$gapMd'>
							<Controller
								control={control}
								name='email'
								rules={{
									required: true,
									validate: emailValidator,
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<YStack gap='$2'>
										<CoTextField
											ref={inputRef}
											autoCapitalize='none'
											keyboardType='email-address'
											value={value}
											onChangeText={onChange}
											onBlur={e => {
												wasFocusedRef.current = false
												onBlur()
											}}
											onFocus={() => {
												wasFocusedRef.current = true
											}}
											placeholder={t('pages.login.plh.email')}
											disabled={loading}
										/>
									</YStack>
								)}
							/>
						</YStack>

						<CoButtonText
							onPress={handleSubmit(onSubmit)}
							filled
							fullWidth
							isLoading={loading}
							filledDisabled={!isValid}
						>
							{t('pages.login.btn.access')}
						</CoButtonText>
					</YStack>
				</CoCard.Content>
			</CoCard>
		</CoPage>
	)
}
