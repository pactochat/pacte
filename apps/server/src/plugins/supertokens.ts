import fp from 'fastify-plugin'
import supertokens from 'supertokens-node'
import { plugin as supertokensFastifyPlugin } from 'supertokens-node/framework/fastify'
import type { TypeInputSendRawEmail } from 'supertokens-node/lib/build/ingredients/emaildelivery/services/smtp'
import Dashboard from 'supertokens-node/recipe/dashboard'
import Passwordless from 'supertokens-node/recipe/passwordless'
import { SMTPService } from 'supertokens-node/recipe/passwordless/emaildelivery'
import Session from 'supertokens-node/recipe/session'
import UserMetadata from 'supertokens-node/recipe/usermetadata'

import { ListSupportedLanguagesCodes, uuid } from '@pacto-chat/shared-domain'
import { logAppServer } from '@pacto-chat/shared-utils-logging'
import { i18next } from '../email/i18n.js'
import { renderPasswordlessOtcHtml } from '../email/templates/password_otc.jsx'

const log = logAppServer.getChildCategory('supertokens')

export function initSupertokens() {
	supertokens.init({
		framework: 'fastify',
		supertokens: {
			connectionURI: process.env.SUPERTOKENS_URL || '',
			apiKey: process.env.SUPERTOKENS_API_KEY || '',
		},
		appInfo: {
			appName: 'Xiroi',
			apiDomain: process.env.SERVER_URL || 'https://api.xiroi.cat',
			apiBasePath: '/auth',
			origin: input => {
				const originHeader = input.request?.getHeaderValue('origin') || ''
				const allowedOrigins = [
					process.env.WEBSITE_URL,
					process.env.WORKSPACE_URL,
				].filter(Boolean)

				if (allowedOrigins.includes(originHeader)) {
					return originHeader
				}
				return process.env.WEBSITE_URL || ''
			},
			websiteDomain: process.env.WEBSITE_URL || 'https://xiroi.cat',
		},
		recipeList: [
			Dashboard.init({
				admins: ['developer@xiroi.cat'],
			}),
			Passwordless.init({
				contactMethod: 'EMAIL',
				flowType: 'USER_INPUT_CODE_AND_MAGIC_LINK',
				emailDelivery: {
					service: new SMTPService({
						smtpSettings: {
							host: process.env.SMTP_HOST || '',
							from: {
								name: 'Xiroi',
								email: process.env.SMTP_REPLY_TO || '',
							},
							password: process.env.SMTP_PASSWORD || '',
							port: Number(process.env.SMTP_PORT) || 2500,
							secure: process.env.NODE_ENV !== 'development',
						},
						override: originalImplementation => {
							return {
								...originalImplementation,
								sendRawEmail(input: TypeInputSendRawEmail) {
									return originalImplementation.sendRawEmail(input)
								},
								getContent: async input => {
									const {
										email,
										userInputCode,
										codeLifetime,
										isFirstFactor,
										userContext,
									} = input

									// Get creator's language
									const request =
										supertokens.getRequestFromUserContext(userContext)
									let language: ListSupportedLanguagesCodes =
										ListSupportedLanguagesCodes.eng // Default to English

									if (request !== undefined) {
										// Get language from request headers
										const acceptLanguage =
											request.getHeaderValue('accept-language')

										if (
											acceptLanguage &&
											acceptLanguage in ListSupportedLanguagesCodes
										) {
											language =
												acceptLanguage as keyof typeof ListSupportedLanguagesCodes
										}
									}

									// Render the email template
									const htmlContent = await renderPasswordlessOtcHtml({
										email,
										userInputCode,
										codeLifetime,
										isFirstFactor,
										language,
									})

									const subject = i18next.t('passwordless_otc.txt.subject', {
										lng: language,
										defaultValue: 'Login to Xiroi',
									})

									return {
										body: htmlContent,
										isHtml: true,
										subject,
										toEmail: email,
									}
								},
							}
						},
					}),
				},
				override: {
					apis: originalImplementation => {
						return {
							...originalImplementation,
							createCodePOST: async input => {
								// Check if createCodePOST exists on originalImplementation
								if (!originalImplementation.createCodePOST) {
									throw new Error('createCodePOST is not implemented')
								}

								if ('email' in input) {
									const existingUsers =
										await supertokens.listUsersByAccountInfo(input.tenantId, {
											email: input.email,
										})

									if (existingUsers.length === 0) {
										// New email, allow sign-up
										return await originalImplementation.createCodePOST(input)
									}

									const isPasswordlessUser = existingUsers.some(u =>
										u.loginMethods.some(
											lm =>
												lm.hasSameEmailAs(input.email) &&
												lm.recipeId === 'passwordless',
										),
									)

									if (isPasswordlessUser) {
										// Existing passwordless user, allow sign-in
										return await originalImplementation.createCodePOST(input)
									}

									// Duplicate email detected
									return {
										status: 'GENERAL_ERROR',
										message:
											'An account with this email already exists. Please sign in using your existing method.',
									}
								}

								// Shouldn't reach here since it's only using email, but included for completeness
								return await originalImplementation.createCodePOST(input)
							},
							consumeCodePOST: async input => {
								if (!originalImplementation.consumeCodePOST) {
									throw new Error('consumeCodePOST is not implemented')
								}

								const response =
									await originalImplementation.consumeCodePOST(input)

								if (response.status === 'OK' && response.createdNewRecipeUser) {
									// New creator signed up
									const userId = response.user.id
									const creatorId = uuid() // Generate a new creatorId

									await UserMetadata.updateUserMetadata(userId, {
										creatorId,
									})
								}

								return response
							},
						}
					},
				},
			}),

			Session.init({
				cookieSecure: true,
				cookieDomain: '.xiroi.local',
				cookieSameSite:
					process.env.NODE_ENV === 'development' ? 'lax' : 'strict',
				exposeAccessTokenToFrontendInCookieBasedAuth: true,
			}),
			UserMetadata.init(),
		],
		// debug: process.env.NODE_ENV === 'development',
	})
}

export const authenticationPlugin = fp(async fastify => {
	log.info('Registering Supertokens API plugin')
	fastify.register(supertokensFastifyPlugin)
})
