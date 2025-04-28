import { Spinner } from 'tamagui'

interface CoSpinnerProps {
	size?: 'small' | 'large'
}

export const CoSpinner = ({ size = 'large' }: CoSpinnerProps) => {
	return <Spinner size={size} color={'$primary'} />
}
