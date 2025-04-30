import type { TokenCache } from '@clerk/clerk-expo'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

import { logAppExpo } from '@pacto-chat/shared-utils-logging'

const createTokenCache = (): TokenCache => {
	return {
		getToken: async (key: string) => {
			try {
				const item = await SecureStore.getItemAsync(key)
				if (item) {
					logAppExpo.debug(`${key} was used 🔐 \n`)
				} else {
					logAppExpo.debug(`No values stored under key: ${key}`)
				}
				return item
			} catch (error) {
				logAppExpo.error('secure store get item error: ', error)
				await SecureStore.deleteItemAsync(key)
				return null
			}
		},
		saveToken: (key: string, token: string) => {
			return SecureStore.setItemAsync(key, token)
		},
	}
}

// SecureStore is not supported on the web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined
