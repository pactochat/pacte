import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { DefaultCatchBoundary, NotFound } from '~components'
import { routeTree } from './routeTree.gen'

export function createRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
	})

	return router
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
