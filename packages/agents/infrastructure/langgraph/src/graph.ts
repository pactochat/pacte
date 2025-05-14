import type { BaseMessage } from '@langchain/core/messages'
import { Annotation, StateGraph } from '@langchain/langgraph'
import type { ChatOpenAI } from '@langchain/openai'
import { Cause, Context, Data, Effect, Layer } from 'effect'

import { ModelService } from './old_services/model'
import {
	type BaseGraphState,
	type GraphStateDefinition,
	createLogEntry,
} from './state'

export type GraphStateStatus = 'started' | 'completed' | 'failed'

/**
 * Error that can occur during agent execution
 */
export class AgentExecutionError extends Data.TaggedError(
	'AgentExecutionError',
)<{
	readonly agent: string
	readonly message?: string
	readonly cause?: Cause.Cause<unknown>
}> {}

/**
 * Create a standard annotation for agent state
 */
function createStateAnnotation() {
	return Annotation.Root<GraphStateDefinition>({
		input: Annotation<unknown>(),
		output: Annotation<unknown>(),
		messages: Annotation<BaseMessage[]>({
			reducer: (prev: BaseMessage[], curr: BaseMessage[]) => [...prev, ...curr],
			default: () => [],
		}),
		executionLog: Annotation<
			Array<{
				agent: string
				timestamp: string
				status: GraphStateStatus
			}>
		>({
			reducer: (prev, curr) => [...prev, ...curr],
			default: () => [],
		}),
		error: Annotation<string | undefined>(),
		agentOutputs: Annotation<Record<string, unknown>>({
			reducer: (prev, curr) => ({ ...prev, ...curr }),
			default: () => ({}),
		}),
	})
}

/**
 * Service for creating and running agent graphs
 */
export class GraphService extends Context.Tag('GraphService')<
	GraphService,
	{
		/**
		 * Creates a standard LangGraph StateGraph with properly configured annotations
		 */
		createGraph: <Input, Output>(
			agentName: string,
		) => StateGraph<GraphStateDefinition>
		/**
		 * Execute a node function with proper error handling
		 */
		executeNode: <Input, Output>(
			agentName: string,
			nodeFn: (
				state: BaseGraphState,
				model: ChatOpenAI,
			) => Promise<Partial<BaseGraphState>>,
		) => (
			state: BaseGraphState,
		) => Effect.Effect<Partial<BaseGraphState>, AgentExecutionError>
	}
>() {
	static readonly Live = Layer.effect(
		GraphService,
		Effect.gen(function* () {
			const model = yield* ModelService

			return {
				createGraph: agentName => {
					const stateAnnotation = createStateAnnotation()
					return new StateGraph(stateAnnotation)
				},

				executeNode: (agentName, nodeFn) => {
					return (
						state: BaseGraphState,
					): Effect.Effect<Partial<BaseGraphState>, AgentExecutionError> =>
						Effect.gen(function* () {
							const startLog = createLogEntry(agentName, 'started')

							const llm = model

							const result = yield* Effect.tryPromise({
								try: () => nodeFn(state, llm),
								catch: error => {
									const errObj: {
										agent: string
										message: string
										cause?: Cause.Cause<unknown>
									} = {
										agent: agentName,
										message: `Error in ${agentName}: ${error}`,
									}
									if (error instanceof Error) {
										errObj.cause = Cause.fail(error)
									}
									return new AgentExecutionError(errObj)
								},
							})

							const completeLog = createLogEntry(agentName, 'completed')

							return {
								...result,
								executionLog: [
									...(result.executionLog || []),
									startLog,
									completeLog,
								],
							} as Partial<BaseGraphState>
						})
				},
			}
		}),
	)
}
