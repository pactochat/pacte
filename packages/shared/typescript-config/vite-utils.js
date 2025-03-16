import fs from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * @typedef {Object} WorkspaceAlias
 * @property {string} find - Package name to find
 * @property {string} replacement - Path to replace with
 */

/**
 * Get monorepo root path from current file location
 * @returns {string} Root path
 */
function getMonorepoRoot() {
	// Get current file's directory
	const currentDir = dirname(fileURLToPath(import.meta.url))
	// Navigate up to monorepo root (4 levels up from vite-utils.js)
	// xiroi-packages/shared/typescript-config/vite-utils.js -> xiroi root
	return resolve(currentDir, '../../..')
}

/**
 * Function to dynamically find all Xiroi packages and create aliases
 * @returns {WorkspaceAlias[]} Array of Vite alias configurations
 */
export function getWorkspaceAliases() {
	const root = getMonorepoRoot()
	const packagesDir = join(root, 'packages')
	const aliases = []

	function findPackages(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const entryPath = join(dir, entry.name)
			if (entry.isDirectory()) {
				findPackages(entryPath)
			} else if (entry.name === 'package.json') {
				const packageJson = JSON.parse(fs.readFileSync(entryPath, 'utf-8'))
				if (packageJson.name) {
					aliases.push({
						find: packageJson.name,
						replacement: resolve(dir, 'src'),
					})
				}
			}
		}
	}

	if (!fs.existsSync(packagesDir)) {
		console.warn(`Packages directory not found: ${packagesDir}`)
		return []
	}

	findPackages(packagesDir)
	return aliases
}
