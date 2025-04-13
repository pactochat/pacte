import { WebEnvironment } from './env'
import { NativeEnvironment } from './env.native'
import { isWeb } from './platform'
import type { EnvVariables } from './types'

export type { EnvVariables }

class Environment {
	private env: WebEnvironment | NativeEnvironment

	constructor() {
		this.env = isWeb() ? new WebEnvironment() : new NativeEnvironment()
	}

	get<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
		return this.env.get(key)
	}

	getAll(): Partial<EnvVariables> {
		return this.env.getAll()
	}

	getMode(): string | undefined {
		return this.env.getMode()
	}
}

export const env = new Environment()
