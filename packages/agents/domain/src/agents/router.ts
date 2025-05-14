import { Schema as S } from 'effect'

import { AgentInput, AgentOutput } from '../types'

export const AgentType = S.Union(
	S.Literal('impact'),
	S.Literal('legalGap'),
	S.Literal('planner'),
	S.Literal('rephraser'),
	S.Literal('simplifier'),
	S.Literal('summarizer'),
)
export type AgentType = typeof AgentType.Type

export const RouterInput = S.extend(
	AgentInput,
	S.Struct({
		/**
		 * List of available agents that can be routed to
		 */
		availableAgents: S.Array(AgentType),
		/**
		 * Specific criteria for routing decisions
		 */
		routingCriteria: S.optional(S.Record({ key: S.String, value: S.Unknown })),
		/**
		 * Whether this is a sequential workflow or a single agent routing
		 */
		isSequential: S.optional(S.Boolean),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/RouterInput' })
export type RouterInput = typeof RouterInput.Type

export const RouterOutput = S.extend(
	AgentOutput,
	S.Struct({
		/**
		 * The next agent to process the request (or array for sequential routing)
		 */
		nextAgent: S.Union(AgentType, S.Array(AgentType)),
		/**
		 * Explanation of the routing decision
		 */
		routingReason: S.String,
		/**
		 * Confidence level in the routing decision (0-1)
		 */
		confidence: S.optional(S.Number),
		/**
		 * Alternative agents that were considered
		 */
		alternativeAgents: S.optional(S.Array(AgentType)),
	}),
).annotations({ identifier: '@pacto-chat/agents-domain/RouterOutput' })
export type RouterOutput = typeof RouterOutput.Type
