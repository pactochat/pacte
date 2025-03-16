import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getXiroiTSPaths } from '@pacto-chat/shared-tsconfig/paths'

// Wrap everything in an async function to ensure imports are ready
async function main() {
	const __filename = fileURLToPath(import.meta.url)
	const consumerDir = path.dirname(__filename)

	const paths = getXiroiTSPaths(consumerDir)

	// Example: read existing tsconfig, modify "compilerOptions.paths", write back
	const tsconfigPath = path.join(consumerDir, 'tsconfig.json')
	const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))

	// Merge or override "paths"
	tsconfig.compilerOptions ??= {}
	tsconfig.compilerOptions.paths ??= {}

	// Pull in all the discovered Xiroi package paths
	for (const [pkgName, [srcPath]] of Object.entries(paths)) {
		// If you prefer "src/index.ts", adjust as needed
		tsconfig.compilerOptions.paths[pkgName] = [srcPath]
	}

	fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2))
	console.log('Updated tsconfig paths:', tsconfig.compilerOptions.paths)
}

// Execute the main function and handle any errors
main().catch(console.error)
