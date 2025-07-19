import { UniverDocsCorePreset } from '@univerjs/preset-docs-core'
import UniverPresetDocsCoreEnUS from '@univerjs/preset-docs-core/locales/en-US'
import { LocaleType, createUniver, merge } from '@univerjs/presets'
import { useEffect, useRef } from 'react'

import '@univerjs/preset-docs-core/lib/index.css'

export function UniverEditor() {
	const docContainerRef = useRef<HTMLDivElement>(null)
	const univerRef = useRef<any>(null)

	useEffect(() => {
		if (!docContainerRef.current) return

		// Create Univer instance with preset
		const { univer, univerAPI } = createUniver({
			locale: LocaleType.EN_US,
			locales: {
				[LocaleType.EN_US]: merge({}, UniverPresetDocsCoreEnUS),
			},
			presets: [
				UniverDocsCorePreset({
					container: docContainerRef.current,
				}),
			],
		})

		univerRef.current = univer

		// Create a new document
		univerAPI.createUniverDoc({})

		return () => {
			if (univerRef.current) {
				univerRef.current.dispose()
				univerRef.current = null
			}
		}
	}, [])

	return (
		<div style={{ flex: 1, width: '100%', height: '100%' }}>
			<div
				ref={docContainerRef}
				style={{
					width: '100%',
					height: '100%',
					position: 'relative',
				}}
			/>
		</div>
	)
}
