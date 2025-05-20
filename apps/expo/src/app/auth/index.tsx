import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Data, Effect, Match, Schema } from 'effect'
import { useRouter } from 'expo-router'
import React, { useCallback, useRef, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { showMessage } from 'react-native-flash-message'
import { YStack } from 'tamagui'

import { Email } from '@aipacto/shared-domain'
import {
	CoButtonText,
	CoCard,
	CoPage,
	CoTextField,
} from '@aipacto/shared-ui-core/components'
import { useTranslation } from '@aipacto/shared-ui-localization'
import { logExpoPagesAuth } from '@aipacto/shared-utils-logging'
import { UnknownException } from 'effect/Cause'

const log = logExpoPagesAuth.getChildCategory('login')

type FormValues = {
	email: string
}

interface ClerkError {
	errors?: Array<{
		code: string
	}>
}

interface AuthResult {
	email: string
	isSignUp: boolean
}

class SignInFailed extends Data.TaggedError('SignInFailed') {}
class SignUpFailed extends Data.TaggedError('SignUpFailed') {}
class InvalidEmail extends Data.TaggedError('InvalidEmail') {}
class ErrorPreparingEmailAddressVerification extends Data.TaggedError(
	'ErrorPreparingEmailAddressVerification',
) {}

export default function LoginScreen() {
	const { signIn, isLoaded: isSignInLoaded } = useSignIn()
	const { signUp, isLoaded: isSignUpLoaded } = useSignUp()
	const router = useRouter()
	const { t } = useTranslation()
	const [loading, setLoading] = useState(false)

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

	const onSubmit = (data: FormValues) => {
		Effect.runPromise(
			Effect.gen(function* () {
				if (!isSignInLoaded || !isSignUpLoaded) {
					log.debug('Auth not loaded, skipping submission...')
					return Effect.void
				}

				log.debug(`Attempting authentication for ${data.email}...`)
				setLoading(true)
				const isValidEmail = validateEmail(data.email)

				if (!isValidEmail) {
					return yield* Effect.fail(new InvalidEmail())
				}

				const result = yield* Effect.tryPromise({
					try: () =>
						// Create a sign-in instance that maintains the sign-in lifecycle state through its "status" property https://github.com/clerk/clerk-docs/blob/main/docs/references/javascript/sign-in.mdx#properties.
						signIn.create({
							identifier: data.email,
							strategy: 'email_code',
						}),
					catch: err => {
						if (
							typeof err === 'object' &&
							err !== null &&
							'errors' in err &&
							Array.isArray((err as any).errors) &&
							(err as any).errors?.[0]?.code === 'form_identifier_not_found'
						) {
							log.debug(
								`No account found, attempting sign up for ${data.email}`,
							)

							return Effect.tryPromise(() =>
								signUp.create({
									emailAddress: data.email,
								}),
							).pipe(
								Effect.map(result => {
									log.debug(
										'Account created. Now preparing email address verification...',
										{ signUpResult: result },
									)
									return Effect.tryPromise(() =>
										signUp.prepareEmailAddressVerification(),
									)
								}),
								Effect.map(
									_ =>
										({
											email: data.email,
											isSignUp: true,
										}) as AuthResult,
								),
								Effect.mapError(
									_ => new ErrorPreparingEmailAddressVerification(),
								),
							)
						}
						return Effect.fail(new SignInFailed())
					},
				}).pipe(
					Effect.flatMap(result => {
						log.debug(`Signed in status "${result.status}"`)

						if (
							result.status === 'needs_first_factor' || // For sign-in flow
							result.status === 'complete' // For sign-up flow
						) {
							log.debug('Sign in successful')

							// return Effect.succeed({
							// 	email: data.email,
							// 	isSignUp: false,
							// } as AuthResult)
							router.push({
								pathname: '/auth/verification',
								params: {
									email: data.email,
									isSignUp: 'false',
								},
							})
							return Effect.void
						}
						return Effect.fail(new SignInFailed())
					}),
				)
				return Effect.succeed(result)
			}).pipe(
				Effect.catchTags({
					InvalidEmail: err => {
						setError('email', { type: 'validate' })
						return Effect.void
					},
					SignInFailed: err => {
						log.error(`Authentication error for ${data.email}`)

						showMessage({
							message: t('pages.login.err.login_failed'),
							type: 'danger',
						})
						setLoading(false)

						return Effect.void
					},
				}),
			),
		)
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
					<YStack gap='$gapLg'>
						<YStack gap='$gapMd'>
							<Controller
								control={control}
								name='email'
								rules={{
									required: true,
									validate: emailValidator,
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<YStack gap='$gapXs'>
										<CoTextField
											ref={inputRef}
											autoCapitalize='none'
											keyboardType='email-address'
											value={value}
											onChangeText={onChange}
											onBlur={_ => {
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
