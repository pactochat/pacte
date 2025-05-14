import { type Effect, Schema as S } from 'effect'

import { AgentType } from '@pacto-chat/agents-domain'
import { AgentInput, AgentOutput } from '@pacto-chat/agents-domain'
import type { AgentService } from '../old_services/errors'

/**
 * Status of a workflow execution
 */
export const WorkflowStatus = S.Union(
	S.Literal('pending'),
	S.Literal('running'),
	S.Literal('completed'),
	S.Literal('failed'),
)
export type WorkflowStatus = typeof WorkflowStatus.Type

/**
 * Agent execution information within a workflow
 */
export const AgentExecution = S.Struct({
	/**
	 * Agent type that executed
	 */
	agentType: AgentType,
	/**
	 * Timestamp when execution started
	 */
	startedAt: S.String,
	/**
	 * Timestamp when execution completed
	 */
	completedAt: S.optional(S.String),
	/**
	 * Input provided to the agent
	 */
	input: S.Unknown,
	/**
	 * Output from the agent
	 */
	output: S.optional(S.Unknown),
	/**
	 * Error if execution failed
	 */
	error: S.optional(S.String),
})
export type AgentExecution = typeof AgentExecution.Type

/**
 * Workflow execution state
 */
export const WorkflowState = S.Struct({
	/**
	 * Unique ID for this workflow execution
	 */
	id: S.String,
	/**
	 * Current status of the workflow
	 */
	status: WorkflowStatus,
	/**
	 * Original input to the workflow
	 */
	input: AgentInput,
	/**
	 * Current output state
	 */
	output: S.optional(AgentOutput),
	/**
	 * History of agent executions in this workflow
	 */
	executionHistory: S.Array(AgentExecution),
	/**
	 * Time when the workflow started
	 */
	startedAt: S.String,
	/**
	 * Time when the workflow completed
	 */
	completedAt: S.optional(S.String),
	/**
	 * Error if the workflow failed
	 */
	error: S.optional(S.String),
})
export type WorkflowState = typeof WorkflowState.Type

/**
 * Interface for a workflow that coordinates multiple agents
 */
export interface WorkflowService<I = AgentInput, O = AgentOutput> {
	/**
	 * Execute the workflow with the given input
	 */
	execute(input: I): Effect.Effect<never, Error, O>

	/**
	 * Add an agent to the workflow
	 *
	 * @param type The type of agent
	 * @param agent The agent service implementation
	 * @returns The updated workflow service
	 */
	addAgent(type: AgentType, agent: AgentService<any, any>): this

	/**
	 * Get the current state of the workflow
	 *
	 * @param workflowId ID of the workflow to get state for
	 * @returns Effect containing the workflow state
	 */
	getState(workflowId: string): Effect.Effect<never, Error, WorkflowState>

	/**
	 * Check if an agent is currently registered in the workflow
	 *
	 * @param type The agent type to check
	 * @returns True if the agent is registered
	 */
	hasAgent(type: AgentType): boolean
}

/**
 * Interface for a sequential workflow with predefined steps
 */
export interface SequentialWorkflowService<I = AgentInput, O = AgentOutput>
	extends WorkflowService<I, O> {
	/**
	 * Set the sequence of agents to execute
	 *
	 * @param sequence Array of agent types in execution order
	 * @returns The updated workflow service
	 */
	setSequence(sequence: AgentType[]): this
}
