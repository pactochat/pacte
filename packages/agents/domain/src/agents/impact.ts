import { Schema as S } from 'effect'

import { BaseAgentInput, BaseAgentOutput } from '../types'

/**
 * Types of impact dimensions that can be assessed
 */
export const ImpactDimensionType = S.Union(
	S.Literal('social'),
	S.Literal('financial'),
	S.Literal('environmental'),
	S.Literal('legal'),
	// S.Literal('ethical'),
	// S.Literal('political'),
	S.Literal('technological'),
)
export type ImpactDimensionType = typeof ImpactDimensionType.Type

/**
 * Impact assessment for a single dimension
 */
export const ImpactDimension = S.Struct({
	/**
	 * Type of impact being assessed
	 */
	type: ImpactDimensionType,
	/**
	 * Impact score from -10 (very negative) to +10 (very positive)
	 */
	score: S.Number,
	/**
	 * Explanation of the impact assessment
	 */
	explanation: S.String,
	/**
	 * Key factors that influenced this assessment
	 */
	keyFactors: S.optional(S.Array(S.String)),
	/**
	 * Confidence level in the assessment (0-1)
	 */
	confidence: S.optional(S.Number),
}).annotations({ identifier: '@pacto-chat/agents-domain/ImpactDimension' })
export type ImpactDimension = typeof ImpactDimension.Type

export const ImpactInput = S.extend(
	BaseAgentInput,
	S.Struct({
		/**
		 * Specific dimensions to assess (defaults to all if not specified)
		 */
		dimensions: S.optional(S.Array(ImpactDimensionType)),
		/**
		 * Specific context to consider for the impact assessment
		 */
		context: S.optional(S.String),
		/**
		 * Whether to provide recommendations for mitigating negative impacts
		 */
		includeRecommendations: S.optional(S.Boolean),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/ImpactInput' })
export type ImpactInput = typeof ImpactInput.Type

export const ImpactOutput = S.extend(
	BaseAgentOutput,
	S.Struct({
		/**
		 * Assessments for each dimension analyzed
		 */
		impacts: S.Array(ImpactDimension),
		/**
		 * The overall impact score (average of all dimension scores)
		 */
		overallImpact: S.Number,
		/**
		 * Summary of the most significant impacts
		 */
		summary: S.String,
		/**
		 * Recommendations for mitigating negative impacts
		 */
		recommendations: S.optional(S.Array(S.String)),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/ImpactOutput' })
export type ImpactOutput = typeof ImpactOutput.Type
