/// <reference types="node" />

import { logSharedUtils } from '@pacto-chat/shared-utils-logging'
import type { EnvVariables } from './types'

const log = logSharedUtils.getChildCategory('env')

export class NativeEnvironment {
	get<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
		const envKey = `EXPO_PUBLIC_${key}`
		return process.env[envKey] as EnvVariables[K]
	}

	getAll(): Partial<EnvVariables> {
		log.debug('Getting all env variables', process.env)
		return Object.keys(process.env).reduce(
			(acc, key) => {
				if (key.startsWith('EXPO_PUBLIC_')) {
					const cleanKey = key.replace('EXPO_PUBLIC_', '') as keyof EnvVariables
					acc[cleanKey] = this.get(cleanKey)
				}
				return acc
			},
			{} as Partial<EnvVariables>,
		)
	}

	getMode(): string | undefined {
		return process.env.NODE_ENV ?? process.env.EXPO_PUBLIC_MODE
	}
}
