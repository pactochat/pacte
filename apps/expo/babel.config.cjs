module.exports = api => {
	api.cache(true)

	return {
		// Remove console.* in production https://github.com/trezor/trezor-suite/blob/cdb0f685bc4ff9731edb946b76af9adf3434bc73/suite-native/app/babel.config.js
		env: {
			production: {
				plugins: ['transform-remove-console'],
			},
		},
		presets: ['babel-preset-expo'],
		plugins: [
			...(process.env.EAS_BUILD_PLATFORM === 'android'
				? []
				: [
						[
							'@tamagui/babel-plugin',
							{
								components: ['@pacto-chat/shared-ui-core', 'tamagui'],
								config:
									'../../packages/shared/ui/core/src/theme/tamagui.config.ts',
								disable: true,
							},
						],
					]),
		],
	}
}
