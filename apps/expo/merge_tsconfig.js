import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tsConfigRoot = path.resolve(
	__dirname,
	'../../packages/shared/typescript-config',
)

// Function to recursively resolve and merge TypeScript configs
function resolveConfig(configPath, visitedPaths = new Set()) {
	if (visitedPaths.has(configPath)) {
		console.warn(
			`Circular dependency detected in TypeScript configs: ${configPath}`,
		)
		return {}
	}

	visitedPaths.add(configPath)

	// Read the config file
	const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
	let result = { ...config }

	// If it extends another config, resolve that first
	if (config.extends) {
		let extendedConfigPath

		// Handle different types of extensions
		if (config.extends.startsWith('./')) {
			// Relative path within the same directory
			extendedConfigPath = path.resolve(
				path.dirname(configPath),
				config.extends,
			)
		} else if (config.extends.includes('/')) {
			// Looks like a package path (e.g., @pacto-chat/...)
			// In a real app, you might need node module resolution here
			extendedConfigPath = path.resolve(tsConfigRoot, config.extends)
		} else {
			// Simple name might be in the same directory
			extendedConfigPath = path.resolve(
				path.dirname(configPath),
				config.extends,
			)
		}

		const baseConfig = resolveConfig(extendedConfigPath, visitedPaths)

		// Deep merge the configs
		result = deepMerge(baseConfig, result)
		// Remove the extends property as we've already resolved it
		result = { ...result }
		result.extends = undefined
	}

	return result
}

// Deep merge utility
function deepMerge(target, source) {
	const result = { ...target }

	for (const key of Object.keys(source)) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			if (
				target[key] &&
				typeof target[key] === 'object' &&
				!Array.isArray(target[key])
			) {
				result[key] = deepMerge(target[key], source[key])
			} else {
				result[key] = { ...source[key] }
			}
		} else {
			result[key] = source[key]
		}
	}

	return result
}

// Adjust paths to be relative to the Expo app
function adjustPaths(config) {
	if (config.compilerOptions?.paths) {
		const adjustedPaths = {}
		for (const [key, value] of Object.entries(config.compilerOptions.paths)) {
			adjustedPaths[key] = value.map(p => {
				// Add ../../packages/ prefix to most paths, handling different relative patterns
				if (p.startsWith('../')) {
					return `../../packages/${p.slice(3)}`
				}
				if (!p.startsWith('../../')) {
					// If it doesn't already have ../../, add it
					return `../../${p}`
				}
				return p
			})
		}
		config.compilerOptions.paths = adjustedPaths
	}
	return config
}

// Main execution
try {
	// Resolve the UI Native config
	const uiConfigPath = path.resolve(tsConfigRoot, 'ui_native.json')
	let resolvedUiConfig = resolveConfig(uiConfigPath)

	// Adjust paths for the Expo app context
	resolvedUiConfig = adjustPaths(resolvedUiConfig)

	// Create merged config that extends Expo but includes UI settings
	const mergedConfig = {
		extends: 'expo/tsconfig.base',
		compilerOptions: {
			// Include resolved UI config compiler options
			...resolvedUiConfig.compilerOptions,
		},
		include: [
			'**/*.ts',
			'**/*.tsx',
			'.expo/types/**/*.ts',
			'expo-env.d.ts',
			'package.json', // For the version of the Expo app config
		],
		exclude: ['node_modules'],
	}

	// Write the merged config
	fs.writeFileSync(
		path.resolve(__dirname, 'tsconfig.merged.json'),
		JSON.stringify(mergedConfig, null, 2),
	)

	console.log('Successfully merged tsconfig files with full extension chain!')
} catch (error) {
	console.error('Error merging TypeScript configs:', error)
	process.exit(1)
}
