// import './styles.css'
import '@tamagui/core/reset.css' // Get more consistent styles across browsers https://tamagui.dev/docs/guides/next-js#reseting-css

import type { Metadata } from 'next'

import { NextTamaguiProvider } from '../../providers/next_tamagui_provider'

export const metadata: Metadata = {
	title: 'Pacto',
	description: 'Pacto - Your AI Assistant',
	icons: '/favicon.ico',
}

export default function RootLayout({
	children,
}: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<link
					href='https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap'
					rel='stylesheet'
				/>
				<link
					href='https://fonts.googleapis.com/css2?family=Literata:wght@400;500;700&display=swap'
					rel='stylesheet'
				/>
			</head>
			<body>
				<NextTamaguiProvider>{children}</NextTamaguiProvider>
			</body>
		</html>
	)
}
