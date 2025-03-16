import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { JotaiProvider } from '@pacto-chat/shared-ui-providers'
import { routeTree } from './routes.js'

import '~providers/supertokens' // Initialize Supertokens

/**
 * Create and configure the TanStack router with our route tree.
 * This handles all routing in the web application.
 */
const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	scrollRestoration: true,
})

// Register the router for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

const container = document.getElementById('root')
if (!container) {
	throw new Error('Web structure not found')
}

const root = createRoot(container)

root.render(
	<StrictMode>
		<JotaiProvider>
			<RouterProvider router={router} />
		</JotaiProvider>
	</StrictMode>,
)
