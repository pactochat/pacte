import { Spinner } from '../theme'

interface CoSpinnerProps {
	size?: 'small' | 'large'
}

export const CoSpinner = ({ size = 'large' }: CoSpinnerProps) => {
	return <Spinner size={size} color={'$primary'} />
}
