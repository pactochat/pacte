import fs from 'node:fs'
import { resolve } from 'node:path'
import path from 'node:path'
import { tamaguiExtractPlugin, tamaguiPlugin } from '@tamagui/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { getWorkspaceAliases } from '@pacto-chat/shared-tsconfig/vite'

export default defineConfig(({ mode }) => {
	return {
		appType: 'spa',
		base: '/',
		build: {
			cssTarget: 'safari15', // For Tamagui https://tamagui.dev/docs/guides/one
			emptyOutDir: true,
			outDir: '../dist',
			rollupOptions: {
				input: 'src/index.html',
				output: {
					format: 'es',
				},
			},
			sourcemap: mode !== 'production',
			target: ['es2022'],
		},
		// For Tamagui https://tamagui.dev/docs/guides/vite
		define: {
			DEV: `${mode === 'development'}`,
			'process.env.NODE_ENV': JSON.stringify(mode),
		},
		envDir: '..',
		esbuild: {
			target: 'es2022',
			supported: {
				'top-level-await': true,
			},
		},
		optimizeDeps: {
			esbuildOptions: {
				loader: {
					// '.js': 'jsx', // For Tamagui https://tamagui.dev/docs/guides/vite
					'.ts': 'ts',
					'.tsx': 'tsx',
				},
				// For Tamagui https://tamagui.dev/docs/guides/vite
				resolveExtensions: [
					'.ts',
					'.tsx',
					'.mts',
					'.js',
					'.jsx',
					'.mjs',
					'.json',
					// Native extensions last
					'.web.ts',
					'.web.tsx',
					'.web.js',
					'.web.jsx',
				],
			},
		},
		plugins: [
			react(),
			tamaguiPlugin({
				config: '../../packages/shared/ui/core/src/theme/tamagui.config.ts',
				components: ['tamagui'],
				disableExtraction: process.env.NODE_ENV === 'development',
				disableDebugAttr: true,
				logTimings: mode !== 'production',
			}),
			// [Optional] Add the optimizing compiler
			mode === 'production'
				? tamaguiExtractPlugin({
						config: '../../packages/shared/ui/core/src/theme/tamagui.config.ts',
						components: ['tamagui'],
						disableDebugAttr: true,
						logTimings: true,
						useReactNativeWebLite: false,
					})
				: null,
		].filter(Boolean),
		// Test locally the production build
		preview: {
			port: 4173,
			host: 'web.localhost',
			strictPort: true,
			https: {
				key: fs.readFileSync(
					path.join(__dirname, '../../certificates', 'localhost-key.pem'),
				),
				cert: fs.readFileSync(
					path.join(__dirname, '../../certificates', 'localhost.pem'),
				),
			},
		},
		publicDir: '../public',
		resolve: {
			alias: [...getWorkspaceAliases()],
			conditions: [
				'development',
				mode === 'development' ? 'development' : 'default',
			],
			dedupe: ['react', 'react-dom'],
			extensions: [
				'.web.js',
				'.web.jsx',
				'.web.ts',
				'.web.tsx',
				'.mjs',
				'.js',
				'.mts',
				'.ts',
				'.jsx',
				'.tsx',
				'.json',
			],
			preserveSymlinks: true,
		},
		root: 'src',
		// Development server config
		server: {
			open: false,
			port: 3010,
			host: '0.0.0.0', // Allow external access (Caddy proxy)
			strictPort: true,
			proxy: {
				// Only proxy exact /api or /api/ paths
				'/pacto-chat-api': {
					target: 'https://api.pacto.local',
					changeOrigin: true,
					secure: mode !== 'development', // Ignore self-signed cert in dev
					rewrite: path => path.replace(/^\/pacto-chat-api/, ''),
					configure: (proxy, options) => {
						console.log('Proxy target:', options.target) // Debug log
					},
				},
			},
			hmr: {
				protocol: 'wss', // Use WebSocket Secure
				host: 'web.pacto.local', // Match Caddy’s domain
			},
			fs: {
				allow: [
					resolve(__dirname, '..'), // parent of workspace app
					resolve(__dirname, '../../packages'), // packages directory
				],
			},
			watch: {
				ignored: [
					'!**/node_modules/@pacto-chat/**', // Watch monorepo packages
					'!../../packages/**', // Watch source files
					'**/node_modules/**', // Ignore other node_modules
				],
			},
		},
		ssr: {
			// Vite 6 style configuration (for Tamagui https://tamagui.dev/docs/guides/one)
			noExternal: true,
		},
	}
})
