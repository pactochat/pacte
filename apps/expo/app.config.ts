/**
 * TypeScript-based Expo configuration
 */

import type { ConfigContext, ExpoConfig } from 'expo/config'

import { version } from './package.json'

type BuildType = 'development' | 'production'

type ExpoPlugins = ExpoConfig['plugins']

const appIconsIos = {
	development: './assets/icon.png',
	production: './assets/icon.png',
} as const satisfies Record<BuildType, string>

const appIconsAndroid = {
	development: {
		backgroundColor: '#ffffff',
	},
	production: {
		backgroundColor: '#ffffff',
	},
} as const

const appNames = {
	development: 'Pacto Chat Dev',
	production: 'Pacto Chat',
} as const satisfies Record<BuildType, string>

const associatedDomains = {
	development: ['applinks:localhost:3000'],
	production: ['applinks:pacto.chat'],
} as const satisfies Record<BuildType, string[]>

const bundleIdentifiers = {
	development: 'chat.pacto.app.dev',
	production: 'chat.pacto.app',
} as const satisfies Record<BuildType, string>

const deepLinkingDomains = {
	development: ['localhost:3000'],
	production: ['pacto.chat'],
} as const satisfies Record<BuildType, string[]>

const projectIds = {
	development: '',
	production: '',
} as const satisfies Record<BuildType, string>

const getPlugins = (domains: string[]): NonNullable<ExpoPlugins> => {
	const plugins = [
		'expo-router',
		'expo-localization',
		[
			'expo-splash-screen',
			{
				backgroundColor: '#ffffff',
				image: './assets/splash-icon.png',
				resizeMode: 'contain',
			},
		],
		[
			'expo-build-properties',
			{
				android: {
					compileSdkVersion: 34,
					targetSdkVersion: 34,
					intentFilters: [
						{
							// Needed for Universal Links
							action: 'VIEW',
							autoVerify: true,
							data: {
								scheme: 'https',
								host: domains[0], // Primary domain
								pathPrefix: '/',
							},
							category: ['BROWSABLE', 'DEFAULT'],
						},
					],
				},
				ios: {
					deploymentTarget: '15.1',
				},
			},
		],
	]

	// You can conditionally add environment-specific plugins
	// For example, add Sentry only in production:
	// if (buildType === 'production') {
	//   plugins.push([
	//     '@sentry/react-native/expo',
	//     {
	//       url: 'https://sentry.io/',
	//       project: 'pacto-chat',
	//       organization: 'your-org',
	//     },
	//   ]);
	// }

	return plugins as NonNullable<ExpoPlugins>
}

const buildType =
	(process.env.EXPO_PUBLIC_ENVIRONMENT as BuildType) ?? 'development'

export default ({ config }: ConfigContext): ExpoConfig => {
	const appIconIos = appIconsIos[buildType]
	const appIconAndroid = appIconsAndroid[buildType]
	const appLinks = associatedDomains[buildType]
	const appName = appNames[buildType]
	const bundleIdentifier = bundleIdentifiers[buildType]
	const domains = deepLinkingDomains[buildType]
	const projectId = projectIds[buildType]

	console.log(`Building app for ${buildType} environment`)

	return {
		name: appName,
		slug: 'pacto-chat',
		version,
		orientation: 'portrait',
		icon: appIconIos,
		userInterfaceStyle: 'light',
		newArchEnabled: true,
		splash: {
			image: './assets/splash-icon.png',
			resizeMode: 'contain',
			backgroundColor: '#ffffff',
		},
		assetBundlePatterns: ['**/*'],
		ios: {
			supportsTablet: true,
			bundleIdentifier,
			associatedDomains: appLinks,
		},
		android: {
			adaptiveIcon: {
				foregroundImage: './assets/adaptive-icon.png',
				...appIconAndroid,
			},
			package: bundleIdentifier,
			versionCode: 1,
			intentFilters: [
				{
					action: 'VIEW',
					autoVerify: true,
					data: [
						{
							scheme: 'pacto',
						},
						...domains.map(domain => ({
							scheme: 'https',
							host: domain,
							pathPrefix: '/',
						})),
					],
					category: ['BROWSABLE', 'DEFAULT'],
				},
			],
		},
		web: {
			bundler: 'metro',
			output: 'static',
			favicon: './assets/favicon.png',
		},
		plugins: getPlugins(domains),
		experiments: {
			typedRoutes: true,
		},
		extra: {
			...config.extra,
			deepLinking: {
				domains,
				scheme: 'pacto',
			},
			eas: {
				projectId,
			},
		},
		scheme: 'pacto',
		owner: 'your-expo-username', // Replace with your actual Expo account username
		// You could add a GitHub URL if you have a public repo
		// githubUrl: 'https://github.com/yourusername/pacto-chat',
		backgroundColor: '#ffffff',
		primaryColor: '#6366f1', // Change this to match your app's primary color
	}
}
