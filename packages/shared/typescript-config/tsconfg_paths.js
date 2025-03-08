import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function getTSPaths(consumerDirname) {
	const monorepoRoot = getMonorepoRoot()
	const packagesDir = path.join(monorepoRoot, 'packages')

	const pathsObject = {}

	function findPackages(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const entryPath = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				findPackages(entryPath)
			} else if (entry.name === 'package.json') {
				try {
					const pkgJson = JSON.parse(fs.readFileSync(entryPath, 'utf8'))
					if (pkgJson.name) {
						const pkgDir = path.dirname(entryPath)
						const srcDir = path.join(pkgDir, 'src')
						if (fs.existsSync(srcDir)) {
							const relative = path
								.relative(consumerDirname, srcDir)
								.replace(/\\/g, '/')
							pathsObject[pkgJson.name] = [relative]
						}
					}
				} catch {
					// ignore JSON parse errors
				}
			}
		}
	}

	if (fs.existsSync(packagesDir)) {
		findPackages(packagesDir)
	}

	return pathsObject
}

function getMonorepoRoot() {
	const thisFileDir = path.dirname(fileURLToPath(import.meta.url))
	return path.resolve(thisFileDir, '../../..')
}
