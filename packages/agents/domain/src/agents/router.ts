import { Effect, JSONSchema, Schema as S } from 'effect'

import { BaseAgentInput, BaseAgentOutput } from '../types'

export const AgentType = S.Union(
	S.Literal('impact'),
	// S.Literal('legalGap'),
	// S.Literal('planner'),
	// S.Literal('rephraser'),
	S.Literal('simplifier'),
	S.Literal('summarizer'),
)
export type AgentType = typeof AgentType.Type

export const RouterInput = S.extend(
	BaseAgentInput,
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
).annotations({ identifier: '@aipacto/agents-domain/RouterInput' })
export type RouterInput = typeof RouterInput.Type

export const RouterOutput = S.extend(
	BaseAgentOutput,
	S.Struct({
		nextAgent: S.Union(AgentType, S.Array(AgentType)),
		/**
		 * Explanation of the routing decision
		 */
		routingReason: S.String,
		/**
		 * Alternative agents that were considered
		 */
		alternativeAgents: S.optional(S.Array(AgentType)),
	}),
).annotations({ identifier: '@aipacto/agents-domain/RouterOutput' })
export type RouterOutput = typeof RouterOutput.Type
