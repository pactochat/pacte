import { Schema as S } from 'effect'

import { AgentInput, AgentOutput } from '../types'

export const SummarizerInput = S.extend(
	AgentInput,
	S.Struct({
		/**
		 * Maximum length of the summary in characters
		 */
		maxLength: S.optional(S.Number),
		/**
		 * Key points that must be included in the summary
		 */
		preserveKeyPoints: S.optional(S.Array(S.String)),
		/**
		 * Format for the summary
		 */
		format: S.optional(
			S.Union(
				S.Literal('bullet'),
				S.Literal('paragraph'),
				S.Literal('outline'),
			),
		),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/SummarizerInput' })
export type SummarizerInput = typeof SummarizerInput.Type

export const SummarizerOutput = S.extend(
	AgentOutput,
	S.Struct({
		originalText: S.String,
		/**
		 * Key points extracted from the text
		 */
		keyPoints: S.Array(S.String),
		/**
		 * Actual length of the summary in characters
		 */
		length: S.Number,
		/**
		 * Estimated reading time in seconds
		 */
		readingTime: S.optional(S.Number),
		/**
		 * The format used for the summary
		 */
		format: S.Union(
			S.Literal('bullet'),
			S.Literal('paragraph'),
			S.Literal('outline'),
		),
		/**
		 * Percentage of original content retained in the summary
		 */
		compressionRatio: S.optional(S.Number),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/SummarizerOutput' })
export type SummarizerOutput = typeof SummarizerOutput.Type
