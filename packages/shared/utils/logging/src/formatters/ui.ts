import { LogLevel } from 'typescript-logging'

import type { LogMessage, MessageFormatter } from '../types'
import { formatArgs } from '../utils'

export const uiFormatter: MessageFormatter = {
	formatMessage: (msg: LogMessage) => {
		if (msg.level == null) throw new Error('Log level is required')

		const levelStyle =
			msg.level === LogLevel.Warn
				? 'color: #FFA500;'
				: msg.level === LogLevel.Debug
					? 'color: #9370DB;'
					: msg.level === LogLevel.Error || msg.level === LogLevel.Fatal
						? 'color: #FF0000;'
						: 'color: #008000;'

		const levelStr = `%c${LogLevel[msg.level].toUpperCase()}%c`
		const categoryStr = `%c[${msg.logNames}]%c`

		let message = msg.message
		try {
			const json = typeof message === 'string' ? JSON.parse(message) : message
			message = JSON.stringify(json, null, 2)
		} catch (e) {
			// Not JSON, keep original
		}

		const formattedArgs = formatArgs([...(msg.args ?? [])])

		return {
			text: `${levelStr} ${categoryStr} ${message} ${formattedArgs}`,
			styles: [levelStyle, '', 'color: #666;', ''],
		}
	},
}
