import type { tamaguiConfig } from '@pacto-chat/shared-ui-core/theme'

export type CustomTamaguiConfigType = typeof tamaguiConfig

declare module '@pacto-chat/shared-ui-core/theme' {
	interface ICustomTamaguiConfig extends CustomTamaguiConfigType {}
}
