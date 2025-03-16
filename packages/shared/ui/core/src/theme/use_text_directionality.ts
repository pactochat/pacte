import { useDirection } from '@tamagui/use-direction'

export function useTextDirectionality(
	value: 'right' | 'left',
): 'right' | 'left' {
	const direction = useDirection()
	if (direction === 'rtl') {
		return value === 'right' ? 'left' : 'right'
	}
	return value
}
