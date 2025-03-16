import type { RawLogMessage } from 'typescript-logging'

export type LogMessage = Omit<RawLogMessage, 'args'> & {
	args?: readonly unknown[]
}

export interface MessageFormatter {
	formatMessage: (msg: LogMessage) => {
		text: string
		styles: string[]
	}
}
