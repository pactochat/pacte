/**
 * Scans the monorepo packages directory and builds a mapping of package names to source paths
 */
const fs = require('node:fs')
const path = require('node:path')

/**
 * Get all package.json files in the packages directory
 * @param {string} dir - Directory to scan
 * @param {Array} results - Array to store results
 * @returns {Array} Array of package.json file paths
 */
function findPackageJsonFiles(dir, results = []) {
	const entries = fs.readdirSync(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			findPackageJsonFiles(fullPath, results)
		} else if (entry.name === 'package.json') {
			results.push(fullPath)
		}
	}

	return results
}

/**
 * Extract package information from package.json files
 * @param {string} projectRoot - Root directory of the app
 * @returns {Object} Mapping of package names to source paths
 */
function getMonorepoPackages(projectRoot) {
	const monorepoRoot = path.resolve(projectRoot, '../..')
	const packagesDir = path.resolve(monorepoRoot, 'packages')

	// Read the app's package.json to get dependencies
	const appPackageJson = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
	)
	const appDependencies = {
		...appPackageJson.dependencies,
		...appPackageJson.devDependencies,
	}

	console.log('Scanning for packages in:', packagesDir)

	// Find all package.json files
	const packageJsonFiles = findPackageJsonFiles(packagesDir)
	const packagesMap = {}

	// Process each package.json
	for (const packageJsonPath of packageJsonFiles) {
		try {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
			const packageName = packageJson.name

			// Only include packages that are in the app's dependencies
			if (packageName && appDependencies[packageName]) {
				const packageDir = path.dirname(packageJsonPath)
				const srcDir = path.join(packageDir, 'src')

				// Only include packages that have a src directory
				if (fs.existsSync(srcDir)) {
					packagesMap[packageName] = srcDir
				}
			}
		} catch (error) {
			console.warn(`Error processing ${packageJsonPath}:`, error.message)
		}
	}

	console.log(`Found ${Object.keys(packagesMap).length} packages`)
	return packagesMap
}

module.exports = getMonorepoPackages
