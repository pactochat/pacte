import { createAnimations } from '@tamagui/animations-moti'

export const animations = createAnimations({
	bouncy: {
		type: 'spring',
		damping: 10,
		mass: 0.9,
		stiffness: 100,
	},
	fast: {
		type: 'timing',
		duration: 150,
	},
	medium: {
		type: 'timing',
		duration: 300,
	},
	slow: {
		type: 'timing',
		duration: 450,
	},
})
