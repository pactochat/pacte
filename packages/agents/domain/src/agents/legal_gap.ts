import { Schema as S } from 'effect'

import { BaseAgentInput, BaseAgentOutput } from '../types'

/**
 * Risk level classification for legal gaps
 */
export const RiskLevel = S.Union(S.Literal('low'), S.Literal('high'))
export type RiskLevel = typeof RiskLevel.Type

/**
 * A single legal gap or issue identified
 */
export const LegalGap = S.Struct({
	/**
	 * Description of the legal issue or gap
	 */
	issue: S.String,
	/**
	 * Risk level associated with this gap
	 */
	risk: RiskLevel,
	/**
	 * Potential consequences if this gap is not addressed
	 */
	consequences: S.String,
	/**
	 * Recommendation to address this gap
	 */
	recommendation: S.String,
	/**
	 * Relevant laws, regulations, or precedents
	 */
	relevantLaws: S.optional(S.Array(S.String)),
	/**
	 * Timeline recommendation for addressing this gap
	 */
	timelineToAddress: S.optional(S.String),
})
export type LegalGap = typeof LegalGap.Type

export const LegalGapInput = S.extend(
	BaseAgentInput,
	S.Struct({
		/**
		 * Jurisdiction for legal assessment (e.g., "US", "EU", "California")
		 */
		jurisdiction: S.optional(S.String),
		/**
		 * Industry context for the legal assessment
		 */
		industryContext: S.optional(S.String),
		/**
		 * Specific laws or regulations to focus on
		 */
		focusAreas: S.optional(S.Array(S.String)),
		/**
		 * Whether to include detailed legal citations
		 */
		includeDetailedCitations: S.optional(S.Boolean),
	}),
).annotations({ identifier: '@aipacto/agents-domain/LegalGapInput' })
export type LegalGapInput = typeof LegalGapInput.Type

export const LegalGapOutput = S.extend(
	BaseAgentOutput,
	S.Struct({
		/**
		 * List of identified legal gaps
		 */
		gaps: S.Array(LegalGap),
		/**
		 * Overall risk assessment summary
		 */
		overallRiskAssessment: S.String,
		/**
		 * Highest risk level identified
		 */
		highestRiskLevel: RiskLevel,
		/**
		 * Prioritized list of gaps to address
		 */
		prioritizedActions: S.optional(S.Array(S.String)),
		/**
		 * Disclaimer about the legal assessment
		 */
		disclaimer: S.String,
		/**
		 * Jurisdiction that was assessed
		 */
		jurisdiction: S.String,
	}),
).annotations({ identifier: '@aipacto/agents-domain/LegalGapOutput' })
export type LegalGapOutput = typeof LegalGapOutput.Type
