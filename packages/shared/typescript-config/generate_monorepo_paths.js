import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

main()

function main() {
	const thisFileDir = path.dirname(fileURLToPath(import.meta.url))
	const monorepoRoot = path.resolve(thisFileDir, '../../..')
	const packagesDir = path.join(monorepoRoot, 'packages')

	const pkgToSrcPaths = scanAllPackages(packagesDir, thisFileDir)
	const baseJsonPath = path.join(thisFileDir, 'base.json')
	const baseJsonRaw = fs.readFileSync(baseJsonPath, 'utf-8')
	const baseJson = JSON.parse(baseJsonRaw)

	baseJson.compilerOptions ??= {}
	// Overwrite paths by resetting to an empty object
	baseJson.compilerOptions.paths = {}

	// Add paths in alphabetical order
	for (const pkgName of Object.keys(pkgToSrcPaths).sort()) {
		baseJson.compilerOptions.paths[pkgName] = pkgToSrcPaths[pkgName]
	}

	fs.writeFileSync(baseJsonPath, `${JSON.stringify(baseJson, null, 2)}\n`)
	console.log(
		`Updated paths in base.json with ${Object.keys(pkgToSrcPaths).length} packages.`,
	)
}

function scanAllPackages(packagesDir, baseDir) {
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
						if (fs.existsSync(srcFolder)) {
							const relative = path
								.relative(baseDir, srcFolder)
								.replace(/\\/g, '/')

							if (pkgJson.exports && typeof pkgJson.exports === 'object') {
								const hasRootExport = '.' in pkgJson.exports
								const hasSubpathExports = Object.keys(pkgJson.exports).some(
									key => key !== '.',
								)

								// Only add root path if there's a root export or no exports defined
								if (hasRootExport || !pkgJson.exports) {
									results[pkgJson.name] = [relative]
								}

								// Add wildcard path if there are subpath exports
								if (hasSubpathExports) {
									results[`${pkgJson.name}/*`] = [`${relative}/*`]
								}
							} else {
								// If no exports field, use default root path
								results[pkgJson.name] = [relative]
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
