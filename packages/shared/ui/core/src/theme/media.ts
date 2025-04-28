/*
 * Copied from https://github.com/Uniswap/interface/blob/main/packages/ui/src/theme/media.ts
 */

import { breakpoints } from './breakpoints'

/**
 * Defines responsive breakpoints for the application.
 *
 * `gt` means "greater than"
 */
export const media = {
	// xs: { maxWidth: 599 },
	// sm: { minWidth: 600, maxWidth: 959 },
	// md: { minWidth: 960, maxWidth: 1279 },
	// lg: { minWidth: 1280, maxWidth: 1919 },
	// xl: { minWidth: 1920 },
	// short: { maxHeight: 820 },
	// tall: { minHeight: 821 },
	// the order here is important: least strong to most
	xxs: { maxWidth: breakpoints.xxs },
	gtXxs: { minWidth: breakpoints.xxs + 1 },
	xs: { maxWidth: breakpoints.xs },
	gtXs: { minWidth: breakpoints.xs + 1 },
	sm: { maxWidth: breakpoints.sm },
	gtSm: { minWidth: breakpoints.sm + 1 },
	md: { maxWidth: breakpoints.md },
	gtMd: { minWidth: breakpoints.md + 1 },
	lg: { maxWidth: breakpoints.lg },
	gtLg: { minWidth: breakpoints.lg + 1 },
	xl: { maxWidth: breakpoints.xl },
	gtXl: { minWidth: breakpoints.xl + 1 },
	xxl: { maxWidth: breakpoints.xxl },
	gtXxl: { minWidth: breakpoints.xxl + 1 },
	xxxl: { maxWidth: breakpoints.xxxl },
	gtXxxl: { minWidth: breakpoints.xxxl + 1 },
	// short: { maxHeight: heightBreakpoints.short },
	// midHeight: { maxHeight: heightBreakpoints.midHeight },
	hoverNone: { hover: 'none' },
	pointerCoarse: { pointer: 'coarse' },
} as const

export const pageConstraints = {
	widthMaxXxs: breakpoints.xxs,
	widthMaxXs: breakpoints.xs,
	widthMaxSm: breakpoints.sm,
	widthMaxMd: breakpoints.md,
	widthMaxLg: breakpoints.lg,
	widthMaxXl: breakpoints.xl,
} as const
