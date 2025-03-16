import { defineConfig } from 'tsup'

export default defineConfig([
	// {
	// 	entry: ['src/index.ts'],
	// 	outDir: 'dist',
	// 	format: ['esm'],
	// 	dts: true,
	// },
	{
		entry: ['src/theme/index.tsx'],
		outDir: 'dist/theme',
		format: ['esm'],
		dts: true,
	},
	{
		entry: ['src/components/index.ts'],
		outDir: 'dist/components',
		format: ['esm'],
		dts: true,
	},
	{
		entry: ['src/icons/index.ts'],
		outDir: 'dist/icons',
		format: ['esm'],
		dts: true,
	},
])
