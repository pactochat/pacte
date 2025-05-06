/**
 * Copied from https://github.com/Uniswap/interface/blob/main/packages/ui/src/theme/spacing.ts
 */

/**
 * Generic spacing tokens (padding, margin, etc)
 */
export const spacing = {
	none: 0,
	spacingXxs: 4,
	spacingXs: 8,
	spacingSm: 10,
	spacingMd: 16,
	spacingLg: 24,
	spacingXl: 32,
	spacingXxxl: 64,
	true: 10,
} as const

export const gap = {
	gapXxs: spacing.spacingXxs,
	gapXs: spacing.spacingXs,
	gapSm: spacing.spacingSm,
	gapMd: spacing.spacingMd,
	gapLg: spacing.spacingLg,
	gapXl: spacing.spacingXl,
	true: spacing.spacingSm,
} as const

export const DEFAULT_BOTTOM_INSET = spacing.spacingLg
export const DEFAULT_BOTTOM_FREE_SPACE = 90
