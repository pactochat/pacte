import type { BaseMessage } from '@langchain/core/messages'
import { Annotation } from '@langchain/langgraph'

import type {
	AgentInput,
	AgentOutput,
	AgentType,
} from '@pacto-chat/agents-domain'

/**
 * Base state used by all LangGraph workflows
 */
export const BaseGraphState = Annotation.Root({
	/**
	 * Original input provided to the workflow
	 */
	input: Annotation<AgentInput>(),

	/**
	 * Current output state
	 */
	output: Annotation<AgentOutput>(),

	/**
	 * Next agent to execute in the workflow
	 */
	currentAgent: Annotation<AgentType | null>(),

	/**
	 * Map of inputs for each agent
	 */
	agentInputs: Annotation<Record<string, any>>({
		reducer: (left, right) => ({ ...left, ...right }),
		default: () => ({}),
	}),

	/**
	 * Map of outputs from each agent
	 */
	agentOutputs: Annotation<Record<string, any>>({
		reducer: (left, right) => ({ ...left, ...right }),
		default: () => ({}),
	}),

	/**
	 * Chat history accumulated during workflow
	 */
	messages: Annotation<BaseMessage[]>({
		reducer: (left, right) => {
			if (Array.isArray(right)) {
				return [...left, ...right]
			}
			return [...left, right]
		},
		default: () => [],
	}),

	/**
	 * Workflow execution log
	 */
	executionLog: Annotation<
		Array<{ agent: string; timestamp: string; status: string }>
	>({
		reducer: (left, right) => [
			...left,
			...(Array.isArray(right) ? right : [right]),
		],
		default: () => [],
	}),

	/**
	 * Any errors that occurred during execution
	 */
	error: Annotation<string | null>(),
})

/**
 * Type for the state used by all LangGraph workflows
 */
export type BaseGraphState = typeof BaseGraphState.State
