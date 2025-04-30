/** @type {import("@babel/core").ConfigFunction} */
module.exports = api => {
	api.cache(true)

	return {
		env: {
			production: {
				// Remove console.* in production https://github.com/trezor/trezor-suite/blob/cdb0f685bc4ff9731edb946b76af9adf3434bc73/suite-native/app/babel.config.js
				plugins: ['transform-remove-console'],
			},
		},
		presets: ['babel-preset-expo'],
		plugins: [
			// '@babel/plugin-transform-class-static-block', // For static classes
			...(process.env.EAS_BUILD_PLATFORM === 'android'
				? []
				: [
						[
							'@tamagui/babel-plugin',
							{
								components: ['@pacto-chat/shared-ui-core', 'tamagui'],
								config:
									'../../packages/shared/ui/core/src/theme/tamagui.config.ts',
								disableExtraction: process.env.NODE_ENV === 'development',
							},
						],
					]),
			'@babel/plugin-proposal-export-namespace-from', // For React Native Reanimated in web
			'react-native-reanimated/plugin', // Must be the last plugin,
		],
	}
}
