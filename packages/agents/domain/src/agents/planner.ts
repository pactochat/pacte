import { Schema as S } from 'effect'

import { AgentInput, AgentOutput } from '../types'

/**
 * A single step in a plan
 */
export const PlanStep = S.Struct({
	/**
	 * Step identifier (e.g., "Step 1")
	 */
	id: S.String,
	/**
	 * Short title for the step
	 */
	title: S.String,
	/**
	 * Detailed description of what to do in this step
	 */
	description: S.String,
	/**
	 * Estimated time to complete (e.g., "2 hours", "3 days")
	 */
	timeEstimate: S.optional(S.String),
	/**
	 * IDs of steps that must be completed before this one
	 */
	dependencies: S.optional(S.Array(S.String)),
	/**
	 * Resources needed for this step
	 */
	resources: S.optional(S.Array(S.String)),
	/**
	 * Potential risks or challenges for this step
	 */
	risks: S.optional(S.Array(S.String)),
}).annotations({ identifier: '@pacto-chat/agents-domain/PlanStep' })
export type PlanStep = typeof PlanStep.Type

export const PlannerInput = S.extend(
	AgentInput,
	S.Struct({
		/**
		 * The specific goal to be achieved by the plan
		 */
		goal: S.optional(S.String),
		/**
		 * Constraints that the plan must adhere to
		 */
		constraints: S.optional(S.Array(S.String)),
		/**
		 * Available resources that can be utilized
		 */
		availableResources: S.optional(S.Array(S.String)),
		/**
		 * Timeline constraints (e.g., "must be completed within 3 months")
		 */
		timeline: S.optional(S.String),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/PlannerInput' })
export type PlannerInput = typeof PlannerInput.Type

export const PlannerOutput = S.extend(
	AgentOutput,
	S.Struct({
		/**
		 * The goal of the plan
		 */
		goal: S.String,
		/**
		 * Step-by-step plan to achieve the goal
		 */
		steps: S.Array(PlanStep),
		/**
		 * Total estimated time to complete all steps
		 */
		totalTimeEstimate: S.optional(S.String),
		/**
		 * Estimated completion date if started now
		 */
		estimatedCompletion: S.optional(S.String),
		/**
		 * Critical path of steps that determine the minimum time to completion
		 */
		criticalPath: S.optional(S.Array(S.String)),
		/**
		 * Key risks or challenges to the overall plan
		 */
		keyRisks: S.optional(S.Array(S.String)),
		/**
		 * Recommendations for successful implementation
		 */
		recommendations: S.optional(S.Array(S.String)),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/PlannerOutput' })
export type PlannerOutput = typeof PlannerOutput.Type
