/**
 * Documentation at https://docs.expo.io/guides/customizing-metro
 */

const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')
const fs = require('node:fs')

/**
 * Scans all packages in the monorepo and returns their paths for Metro configuration
 * @param {string} baseDir - The base directory to scan from (usually __dirname)
 * @returns {Object} - Object with package names as keys and their source paths as values
 */
function getMonorepoPackages(baseDir) {
	const packagesDir = path.resolve(baseDir, '../../packages')
	const results = {}

	function visit(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true })
		for (const entry of entries) {
			const entryPath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				visit(entryPath)
			} else if (entry.name === 'package.json') {
				const pkgJsonStr = fs.readFileSync(entryPath, 'utf-8')
				try {
					const pkgJson = JSON.parse(pkgJsonStr)
					if (pkgJson.name) {
						const pkgFolder = path.dirname(entryPath)
						const srcFolder = path.join(pkgFolder, 'src')

						// Only process if src folder exists
						if (fs.existsSync(srcFolder)) {
							// Always add the base package path for subpath resolution
							results[pkgJson.name] = srcFolder

							// Handle exports field if it exists
							if (pkgJson.exports && typeof pkgJson.exports === 'object') {
								const subpathExports = Object.keys(pkgJson.exports).filter(
									key => key !== '.' && !key.includes('*'),
								)

								// Add specific subpath exports
								for (const subpath of subpathExports) {
									const exportPath = pkgJson.exports[subpath]
									let targetPath

									// Handle different export formats
									if (typeof exportPath === 'string') {
										targetPath = exportPath
									} else if (typeof exportPath === 'object') {
										// Try to find the appropriate export condition
										// Priority: development -> default -> first available
										targetPath =
											exportPath.development ||
											exportPath.default ||
											Object.values(exportPath)[0]
									}

									if (targetPath) {
										// Clean up the subpath and target path
										const cleanSubpath = subpath.replace(/^\.\//, '')
										const resolvedPath = path.join(
											pkgFolder,
											targetPath.replace(/^\.\//, ''),
										)
										// Add both the full subpath and the directory path
										results[`${pkgJson.name}/${cleanSubpath}`] = resolvedPath

										// Add the directory path without the file
										const dirPath = path.dirname(resolvedPath)
										const subpathDir = cleanSubpath.split('/')[0]
										results[`${pkgJson.name}/${subpathDir}`] = path.join(
											srcFolder,
											subpathDir,
										)
									}
								}

								// Handle wildcard exports if any exist
								const wildcardExports = Object.keys(pkgJson.exports).filter(
									key => key.includes('*'),
								)
								for (const wildcard of wildcardExports) {
									const basePath = wildcard.replace('*', '')
									const cleanBasePath = basePath
										.replace(/^\.\//, '')
										.replace(/\/$/, '')
									results[`${pkgJson.name}/${cleanBasePath}`] = path.join(
										srcFolder,
										cleanBasePath,
									)
									results[`${pkgJson.name}/${cleanBasePath}/*`] = path.join(
										srcFolder,
										cleanBasePath,
									)
								}
							}
						}
					}
				} catch {
					// ignore parse errors
				}
			}
		}
	}

	if (fs.existsSync(packagesDir)) {
		visit(packagesDir)
	}

	return results
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Get all monorepo package paths
const monorepoModules = getMonorepoPackages(__dirname)

// Debug log to see what's being registered
console.log('Registered monorepo packages:', monorepoModules)

module.exports = {
	...config,
	resolver: {
		unstable_enablePackageExports: true, // Enable support for the `exports` field in package.json
		unstable_conditionNames: ['development', 'default'],
		sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'cjs', 'mjs'],
		// extraNodeModules: monorepoModules,
	},
}
