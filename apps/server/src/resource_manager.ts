import type { PodSettings } from '@agentic/agents-domain'

export class ResourceManager {
	/**
	 * Decide how much CPU, memory, and time to allocate
	 * based on user input, code size, user role, etc.
	 */
	static getPodSettingsForTask(
		taskComplexity: 'light' | 'medium' | 'heavy',
	): PodSettings {
		switch (taskComplexity) {
			case 'light':
				return {
					runtimeClass: 'kata',
					cpuLimit: '250m',
					memoryLimit: '256Mi',
					timeQuotaSeconds: 30,
				}
			case 'medium':
				return {
					runtimeClass: 'kata',
					cpuLimit: '500m',
					memoryLimit: '512Mi',
					timeQuotaSeconds: 60,
				}
			case 'heavy':
			default:
				return {
					runtimeClass: 'kata',
					cpuLimit: '1',
					memoryLimit: '1Gi',
					timeQuotaSeconds: 120,
				}
		}
	}
}
