import { WebEnvironment } from './env.js'
import { NativeEnvironment } from './env.native.js'
import { isWeb } from './platform.js'
import type { EnvVariables } from './types.js'

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
