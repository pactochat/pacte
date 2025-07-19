import { rootProvider } from './categories'
import { nodeFormatter } from './formatters/node'
import { uiFormatter } from './formatters/ui'
import type { LogMessage } from './types'

export * from './effect_logging'
export * from './categories'

const isNodeEnvironment = (): boolean => {
	try {
		// Check for Node.js process
		return (
			typeof process !== 'undefined' &&
			process.versions != null &&
			process.versions.node != null
		)
	} catch {
		return false
	}
}

const formatter = isNodeEnvironment() ? nodeFormatter : uiFormatter

// Prevent multiple runtime settings updates
let isConfigured = false
if (!isConfigured) {
	rootProvider.updateRuntimeSettings({
		channel: {
			type: 'RawLogChannel',
			write: msg => {
				const { text, styles } = formatter.formatMessage(msg as LogMessage)
				// biome-ignore lint/suspicious/noConsole: <required for logging>
				console.log(text, ...styles)
			},
		},
	})
	isConfigured = true
}
