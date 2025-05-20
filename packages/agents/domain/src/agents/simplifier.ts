import { Schema as S } from 'effect'

import { BaseAgentInput, BaseAgentOutput } from '../types'

/**
 * Complexity level options for simplification
 */
export const SimplifierLevel = S.Union(S.Literal('citizen'), S.Literal('staff'))
export type SimplifierLevel = typeof SimplifierLevel.Type

export const SimplifierInput = S.extend(
	BaseAgentInput,
	S.Struct({
		/**
		 * The target complexity level for simplification
		 */
		targetLevel: S.optional(SimplifierLevel),
		/**
		 * Terms that should be preserved as-is without simplification
		 */
		preserveKeyTerms: S.optional(S.Array(S.String)),
	}),
).annotations({ identifier: '@aipacto/agents-domain/SimplifierInput' })
export type SimplifierInput = typeof SimplifierInput.Type

export const SimplifierOutput = S.extend(
	BaseAgentOutput,
	S.Struct({
		originalText: S.String,
		/**
		 * Target level that was used for simplification
		 */
		targetLevel: SimplifierLevel,
		/**
		 * Score from 1-10 indicating complexity of original text
		 */
		originalComplexityScore: S.Number,
		/**
		 * Score from 1-10 indicating complexity of simplified text
		 */
		resultComplexityScore: S.Number,
		/**
		 * Terms that were preserved without simplification
		 */
		preservedTerms: S.optional(S.Array(S.String)),
	}),
).annotations({ identifier: '@aipacto/agents-domain/SimplifierOutput' })
export type SimplifierOutput = typeof SimplifierOutput.Type
