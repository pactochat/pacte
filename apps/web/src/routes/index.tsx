import { createFileRoute, useRouter } from '@tanstack/react-router'

import { UniverEditor } from '~components'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	return (
		<div style={{ flex: 1, width: '100%', height: '100vh' }}>
			<UniverEditor />
		</div>
	)
}
