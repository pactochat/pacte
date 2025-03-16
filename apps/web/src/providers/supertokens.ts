import SuperTokens from 'supertokens-auth-react'
import Passwordless from 'supertokens-auth-react/recipe/passwordless'
import Session from 'supertokens-auth-react/recipe/session'

import { detectDeviceLanguage } from '@pacto-chat/shared-ui-localization'
import { env } from '@pacto-chat/shared-utils-env-frontend'

SuperTokens.init({
	appInfo: {
		appName: 'Xiroi',
		apiDomain: env.get('SERVER_URL') ?? 'api.xiroi.cat',
		websiteDomain: env.get('WEBSITE_URL') ?? 'xiroi.cat',
		apiBasePath: '/auth',
		websiteBasePath: '/auth',
	},
	getRedirectionURL: async context => {
		if (context.action === 'SUCCESS' && context.newSessionCreated) {
			if (context.redirectToPath !== undefined) {
				return context.redirectToPath
			}
			return '/'
		}
		return undefined
	},
	recipeList: [
		Passwordless.init({
			contactMethod: 'EMAIL',
			preAPIHook: async context => {
				const requestInit = context.requestInit
				const language = detectDeviceLanguage()

				// Send language to Supertokens Core
				const headers = {
					...requestInit.headers,
					'accept-language': language,
				}

				return {
					url: context.url,
					requestInit: {
						...requestInit,
						headers,
					},
				}
			},
		}),
		Session.init(),
	],
})
