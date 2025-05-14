import type { BaseMessage } from '@langchain/core/messages'
import type {
	Annotation,
	BinaryOperatorAggregate,
	LastValue,
} from '@langchain/langgraph'
import { Schema as S } from 'effect'

import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { GraphStateStatus } from './graph'

/**
 * Execution log entry for tracing agent execution
 */
export const ExecutionLogEntry = S.Struct({
	agent: S.String,
	timestamp: S.String,
	status: S.Union(
		S.Literal('started'),
		S.Literal('completed'),
		S.Literal('failed'),
	),
})
export type ExecutionLogEntry = typeof ExecutionLogEntry.Type

/**
 * Base state interface for all agent graphs
 */
export const BaseGraphState = S.Struct({
	/** Input to the agent */
	input: S.Unknown,
	/** Final output from the agent */
	output: S.optional(S.Unknown),
	/** Chat messages history */
	messages: S.Array(S.Unknown),
	/** Execution log for tracking agent progress */
	executionLog: S.Array(ExecutionLogEntry),
	error: S.optional(S.String),
	/** Intermediate outputs from each agent */
	agentOutputs: S.optional(S.Record({ key: S.String, value: S.Unknown })),
}).annotations({
	identifier: '@pacto-chat/agents-infra-langgraph/BaseGraphState',
})
export type BaseGraphState = typeof BaseGraphState.Type

/**
 * State definition for the agent graph
 */
export type GraphStateDefinition = {
	input: LastValue<unknown>
	output: LastValue<unknown>
	messages: BinaryOperatorAggregate<BaseMessage[], BaseMessage[]>
	executionLog: BinaryOperatorAggregate<
		Array<{
			agent: string
			timestamp: string
			status: GraphStateStatus
		}>,
		Array<{
			agent: string
			timestamp: string
			status: GraphStateStatus
		}>
	>
	error: LastValue<string | undefined>
	agentOutputs: BinaryOperatorAggregate<
		Record<string, unknown>,
		Record<string, unknown>
	>
}

/**
 * Creates a log entry for agent execution
 */
export function createLogEntry(
	agent: string,
	status: GraphStateStatus,
	timestamp = nowZoned().toString() as ZonedDateTimeString,
): ExecutionLogEntry {
	return {
		agent,
		timestamp,
		status,
	}
}
