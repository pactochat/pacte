import { Schema as S } from 'effect'

import { BaseAgentInput, BaseAgentOutput } from '../types'

export const RephraserInput = BaseAgentInput.annotations({
	identifier: '@pacto-chat/agents-domain/RephraserInput',
})
export type RephraserInput = typeof RephraserInput.Type

export const RephraserOutput = S.extend(
	BaseAgentOutput,
	S.Struct({
		originalText: S.String,
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/RephraserOutput' })
export type RephraserOutput = typeof RephraserOutput.Type
