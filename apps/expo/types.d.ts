import type { tamaguiConfig } from '@aipacto/shared-ui-core/theme'

export type CustomTamaguiConfigType = typeof tamaguiConfig

declare module '@aipacto/shared-ui-core' {
	interface ICustomTamaguiConfig extends CustomTamaguiConfigType {}
}
