import { createAnimations } from '@tamagui/animations-css'
import type { AnimationConfigType } from '@tamagui/web'

// You might need to import the correct type from the package
export const animations: AnimationConfigType = createAnimations({
	bouncy: '800ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
	fast: 'ease-in 150ms',
	medium: 'ease-in 300ms',
	slow: 'ease-in 450ms',
})
