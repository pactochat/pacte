/**
 * Syncpack docs https://jamiemason.github.io/
 */

/** @type {import("syncpack").RcFile} */
export default {
	dependencyTypes: ['dev', 'prod', 'overrides', 'peer', 'resolutions'],
	filter: '.',
	indent: '	', // One tab
	versionGroups: [
		{
			label: 'TypeScript',
			dependencies: ['typescript'],
			isIgnored: true,
		},
		{
			label: 'Pacto Chat',
			dependencies: ['@pacto-chat/*'],
			policy: 'sameRange',
		},
		{
			label: 'React',
			dependencies: ['@types/react*', 'react', 'react-dom', 'react-native'],
			policy: 'sameRange',
			// isIgnored: true,
		},
		{
			label: 'Effect',
			dependencies: ['effec*', '@effect/*'],
			policy: 'sameRange',
		},
		{
			label: 'Tamagui',
			dependencies: ['tamagu*', '@tamagui/*'],
			policy: 'sameRange',
		},
		{
			label: 'PayloadCMS',
			dependencies: ['@payloadcms/*', 'payload'],
			policy: 'sameRange',
		},
	],
	sortAz: [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'resolutions',
	],
	sortFirst: [
		'name',
		'version',
		'description',
		'repository',
		'packageManager',
		'engines',
		'main',
		'type',
		'types',
		'module',
		'import',
		'exports',
		'react-native',
		'workspaces',
		'scripts',
		'dependencies',
		'peerDependencies',
		'devDependencies',
		'resolutions',
		'author',
		'private',
	],
	sortPackages: true,
	source: ['package.json', 'apps/*/package.json', 'packages/**/package.json'],
}
