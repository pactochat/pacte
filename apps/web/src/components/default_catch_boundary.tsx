import {
	ErrorComponent,
	rootRouteId,
	useMatch,
	useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { CoButtonText } from '@aipacto/shared-ui-core'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
	const router = useRouter()
	const isRoot = useMatch({
		strict: false,
		select: state => state.id === rootRouteId,
	})

	console.error(error)

	return (
		<div
			style={{
				flex: 1,
				padding: '16px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '24px',
				minWidth: 0,
			}}
		>
			<ErrorComponent error={error} />
			<div
				style={{
					display: 'flex',
					gap: '8px',
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<CoButtonText
					onPress={() => {
						router.invalidate()
					}}
					filled
				>
					Try Again
				</CoButtonText>
				{isRoot ? (
					<CoButtonText
						onPress={() => router.navigate({ to: '/' })}
						filledTonal
					>
						Home
					</CoButtonText>
				) : (
					<CoButtonText onPress={() => router.history.back()} filledTonal>
						Go Back
					</CoButtonText>
				)}
			</div>
		</div>
	)
}
