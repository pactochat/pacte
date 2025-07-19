/// <reference types="vite/client" />
/// <reference types="@univerjs/vite-plugin/types" />

import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { ReactNode } from 'react'

import { NotFound } from '~components'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'TanStack Start Starter',
			},
		],
	}),
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
})

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	)
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang='en'>
			<head>
				<HeadContent />
			</head>
			<body
				style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}
			>
				<div
					style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
				>
					{children}
				</div>
				<Scripts />
				<TanStackRouterDevtools position='bottom-right' />
			</body>
		</html>
	)
}
