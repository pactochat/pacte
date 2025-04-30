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
	development: 'Pacte Dev',
	production: 'Pacte',
} as const satisfies Record<BuildType, string>

const associatedDomains = {
	development: ['applinks:localhost:3000'],
	production: ['applinks:pacte.ai'],
} as const satisfies Record<BuildType, string[]>

const bundleIdentifiers = {
	development: 'ai.pacte.dev',
	production: 'ai.pacte',
} as const satisfies Record<BuildType, string>

const deepLinkingDomains = {
	development: ['localhost:3000'],
	production: ['pacte.ai'],
} as const satisfies Record<BuildType, string[]>

const projectIds = {
	development: '',
	production: '',
} as const satisfies Record<BuildType, string>

const getPlugins = (domains: string[]): NonNullable<ExpoPlugins> => {
	const plugins = [
		'expo-font',
		'expo-localization',
		'expo-router',
		'expo-secure-store',
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
					compileSdkVersion: 35,
					targetSdkVersion: 35,
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

	console.log(`Building app for "${buildType}" environment`)

	return {
		name: appName,
		slug: 'pacte',
		version,
		orientation: 'portrait',
		icon: appIconIos,
		userInterfaceStyle: 'automatic', // Required by Tamagui for dark mode
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
							scheme: 'pacte',
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
			favicon: './public/favicon.ico',
			output: 'static',
		},
		plugins: getPlugins(domains),
		experiments: {
			typedRoutes: true,
		},
		extra: {
			...config.extra,
			deepLinking: {
				domains,
				scheme: 'pacte',
			},
			eas: {
				projectId,
			},
		},
		scheme: 'pacte',
		// owner: 'expo-username', // Replace with actual Expo account username
		backgroundColor: '#ffffff',
		primaryColor: '#ff3b6939',
		newArchEnabled: true,
	}
}
