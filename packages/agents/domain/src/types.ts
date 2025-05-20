import { Schema as S } from 'effect'

import {
	ListLanguageCodesLiteral,
	ZonedDateTimeString,
} from '@aipacto/shared-domain'

/**
 * Base input for all agents
 */
export const BaseAgentInput = S.Struct({
	/**
	 * Intent of the user
	 */
	question: S.String,
	/**
	 * The language of the text (ISO 639-3 code)
	 */
	language: S.optional(ListLanguageCodesLiteral),
	/**
	 * Any additional context that might be relevant to processing
	 */
	additionalContext: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	/**
	 * When the request was created
	 */
	timestamp: S.optional(ZonedDateTimeString),
}).annotations({ identifier: '@aipacto/agents-domain/AgentInput' })
export type BaseAgentInput = typeof BaseAgentInput.Type

/**
 * Base output for all agents
 */
export const BaseAgentOutput = S.Struct({
	/**
	 * The processed text result
	 */
	text: S.String,
	/**
	 * The language of the processed text (ISO 639-3 code)
	 */
	language: S.optional(ListLanguageCodesLiteral),
	/**
	 * Additional metadata from the processing
	 */
	metadata: S.optional(S.Record({ key: S.String, value: S.Unknown })),
	/**
	 * When the processing was completed
	 */
	timestamp: S.optional(ZonedDateTimeString),
}).annotations({ identifier: '@aipacto/agents-domain/AgentOutput' })
export type BaseAgentOutput = typeof BaseAgentOutput.Type

export const ProcessingStatus = S.Union(
	S.Literal('pending'),
	S.Literal('processing'),
	S.Literal('completed'),
	S.Literal('failed'),
)
export type ProcessingStatus = typeof ProcessingStatus.Type

/**
 * Base state for all agent operations
 */
export const AgentState = S.Struct({
	/**
	 * Current status of the agent processing
	 */
	status: ProcessingStatus,
	/**
	 * Original input to the agent
	 */
	input: BaseAgentInput,
	/**
	 * Current output state (may be partial during processing)
	 */
	output: S.optional(BaseAgentOutput),
	/**
	 * Any error that has occurred during processing
	 */
	error: S.optional(S.String),
}).annotations({ identifier: '@aipacto/agents-domain/AgentState' })
export type AgentState = typeof AgentState.Type
