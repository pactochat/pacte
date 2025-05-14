import { Schema as S } from 'effect'

import { AgentInput, AgentOutput } from '../types'

export const RephraserInput = AgentInput.annotations({
	identifier: '@pacto-chat/agents-domain/RephraserInput',
})
export type RephraserInput = typeof RephraserInput.Type

export const RephraserOutput = S.extend(
	AgentOutput,
	S.Struct({
		originalText: S.String,
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/RephraserOutput' })
export type RephraserOutput = typeof RephraserOutput.Type
