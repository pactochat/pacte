import { Schema as S } from 'effect'

import {
	ListLanguageCodesLiteral,
	ZonedDateTimeString,
} from '@pacto-chat/shared-domain'

/**
 * Base input for all agents
 */
export const AgentInput = S.Struct({
	/**
	 * The text content to be processed
	 */
	text: S.String,
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
}).annotations({ identifier: '@pacto-chat/agents-domain/AgentInput' })
export type AgentInput = typeof AgentInput.Type

/**
 * Base output for all agents
 */
export const AgentOutput = S.Struct({
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
}).annotations({ identifier: '@pacto-chat/agents-domain/AgentOutput' })
export type AgentOutput = typeof AgentOutput.Type

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
	input: AgentInput,
	/**
	 * Current output state (may be partial during processing)
	 */
	output: S.optional(AgentOutput),
	/**
	 * Any error that has occurred during processing
	 */
	error: S.optional(S.String),
}).annotations({ identifier: '@pacto-chat/agents-domain/AgentState' })
export type AgentState = typeof AgentState.Type
