import { withPayload } from '@payloadcms/next/withPayload'
import { withTamagui } from '@tamagui/next-plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
	modularizeImports: {
		'@tamagui/lucide-icons': {
			transform: '@tamagui/lucide-icons/dist/esm/icons/{{kebabCase member}}',
			skipDefaultConversion: true,
		},
	},
	// Inspired from Tamagui Takeout's config
	transpilePackages: [
		'react-native-web',
		'expo-linking',
		'expo-constants',
		'react-native-gesture-handler',
		'@ts-react/form',
		'react-hook-form',
	],
	experimental: {
		scrollRestoration: true,
	},
}

const withTamaguiConfig = withTamagui({
	config: '../../packages/shared/ui/core/src/theme/tamagui.config.ts',
	components: ['@aipacto/shared-ui-core', 'tamagui'],
	appDir: true,
	outputCSS:
		process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
	disableExtraction: process.env.NODE_ENV === 'development',
})

const plugins = [
	withTamaguiConfig,
	nextConfig => {
		return {
			...nextConfig,
			webpack: (webpackConfig, options) => {
				webpackConfig.resolve.alias = {
					...webpackConfig.resolve.alias,
					'react-native-svg': '@tamagui/react-native-svg',
				}
				if (typeof nextConfig.webpack === 'function') {
					return nextConfig.webpack(webpackConfig, options)
				}
				return webpackConfig
			},
		}
	},
]

export default withPayload(
	plugins.reduce((config, plugin) => {
		return {
			...config,
			...plugin(config),
		}
	}, nextConfig),
	{
		devBundleServerPackages: false,
	},
)
