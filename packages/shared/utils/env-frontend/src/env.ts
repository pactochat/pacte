import { logSharedUtils } from '@pacto-chat/shared-utils-logging'
import type { EnvVariables } from './types.js'

const log = logSharedUtils.getChildCategory('env')

export class WebEnvironment {
	get<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
		const envKey = `VITE_${key}` as const
		return import.meta.env[envKey] as EnvVariables[K]
	}

	getAll(): Partial<EnvVariables> {
		log.debug('Getting all env variables', import.meta.env)

		return Object.keys(import.meta.env).reduce(
			(acc, key) => {
				if (key.startsWith('VITE_')) {
					const cleanKey = key.replace('VITE_', '') as keyof EnvVariables
					acc[cleanKey] = this.get(cleanKey)
				}
				return acc
			},
			{} as Partial<EnvVariables>,
		)
	}

	getMode(): string {
		return import.meta.env.MODE || 'development'
	}
}
