import { rootProvider } from './categories.js'
import { nodeFormatter } from './formatters/node.js'
import { uiFormatter } from './formatters/ui.js'
import type { LogMessage } from './types.js'

export * from './effect_logging.js'
export * from './categories.js'

// // In Node.js: process.versions.node exists
// // In React Native: process.versions is undefined but global exists
// // In Web: process is undefined, but window exists
// const isNode = typeof process !== 'undefined' && process.versions?.node != null

// // Define types for environment detection
// declare const process: { versions?: { node?: string } }

// // Helper type guard for window existence
// function isWindowDefined(): boolean {
// 	return typeof window !== 'undefined'
// }
// const isWindowDefined = (): boolean => {
// 	try {
// 		return (
// 			typeof globalThis !== 'undefined' &&
// 			typeof globalThis.window !== 'undefined'
// 		)
// 	} catch {
// 		return false
// 	}
// }
// const formatter = isWindowDefined() ? uiFormatter : nodeFormatter

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
// const formatter = isNode ? nodeFormatter : uiFormatter // Both RN and Web use browser formatter
const formatter = isNodeEnvironment() ? nodeFormatter : uiFormatter

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

// // Helper to detect if we're in a browser environment
// // Type-safe environment detection
// const isBrowser = (() => {
// 	try {
// 		return (
// 			typeof globalThis !== 'undefined' &&
// 			// @ts-expect-error - Checking window existence at runtime
// 			typeof globalThis.window !== 'undefined' &&
// 			// @ts-expect-error - Checking document existence at runtime
// 			typeof globalThis.window.document !== 'undefined'
// 		)
// 	} catch {
// 		return false
// 	}
// })()
