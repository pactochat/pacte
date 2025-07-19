import { resolve } from 'node:path'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { univerPlugin } from '@univerjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'

import { getWorkspaceAliases } from '@aipacto/shared-tsconfig/vite'

export default defineConfig(({ mode }) => ({
	build: {
		emptyOutDir: true,
		outDir: '../dist',
	},
	envDir: '..',
	resolve: {
		alias: [
			// ...getWorkspaceAliases(),
			{
				find: '~components',
				replacement: resolve(__dirname, 'src/components'),
			},
		],
	},
	plugins: [
		tsConfigPaths(),
		tanstackStart({
			customViteReactPlugin: true,
		}),
		react(),
		univerPlugin(),
	],
	server: {
		open: false,
		port: 3000,
	},
}))
