export const iconSizes = {
	iconXxs: 8,
	iconXs: 12,
	iconSm: 14,
	iconMd: 16,
	iconLg: 20,
	iconXl: 24,
	true: 24,
} as const
export type IconSizesType = keyof typeof iconSizes
