import { LogLevel } from 'typescript-logging'

import type { LogMessage, MessageFormatter } from '../types'
import { formatArgs } from '../utils'

export const nodeFormatter: MessageFormatter = {
	formatMessage: (msg: LogMessage) => {
		if (msg.level == null) throw new Error('Log level is required')

		let levelColor: string
		if (msg.level === LogLevel.Debug) {
			levelColor = '\x1b[35m' // Purple
		} else if (msg.level === LogLevel.Warn) {
			levelColor = '\x1b[33m' // Yellow
		} else if (msg.level === LogLevel.Error || msg.level === LogLevel.Fatal) {
			levelColor = '\x1b[31m' // Red
		} else {
			levelColor = '\x1b[32m' // Green
		}

		const resetColor = '\x1b[0m'
		const levelStr = `${levelColor}${LogLevel[msg.level].toUpperCase()}${resetColor}`
		const categoryStr = `\x1b[90m[${msg.logNames}]\x1b[0m`

		let message = msg.message
		if (typeof message === 'object' && message !== null) {
			try {
				message = JSON.stringify(message, null, 2)
			} catch (e) {
				message = String(message)
			}
		}

		const formattedArgs = formatArgs([...(msg.args ?? [])])

		return {
			text: `${levelStr} ${categoryStr} ${message} ${formattedArgs}`,
			styles: [],
		}
	},
}
