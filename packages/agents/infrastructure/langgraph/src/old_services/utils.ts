import { RunnableLambda } from '@langchain/core/runnables'
import { StateGraph } from '@langchain/langgraph'
import { END } from '@langchain/langgraph'
import { type Context, Effect, Layer } from 'effect'

import { currentIsoDateTimeString } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../old_state'
import { AgentGraphError, AgentProcessingError } from './errors'
import { ModelService } from './model'

/**
 * Create a compiled LangGraph from a StateGraph definition
 */
export const compileGraph = (graph: any) =>
	Effect.try({
		try: () => graph.compile(),
		catch: error =>
			new AgentGraphError({
				message: 'Failed to compile agent graph',
				error,
			}),
	})

/**
 * Creates a base implementation for LangGraph services
 *
 * @param tag The Context tag for the service
 * @param nodeGenerator Function to generate the LangGraph node
 * @returns A Layer containing the service implementation
 */
export function createAgentLayer<I, O>(
	tag: Context.Tag<any, any>,
	nodeGenerator: (
		model: any,
	) => (state: BaseGraphState) => Promise<Partial<BaseGraphState>>,
) {
	return Layer.effect(
		tag,
		Effect.gen(function* () {
			const model = yield* ModelService

			/**
			 * Creates a LangGraph for this agent
			 */
			const createGraph = () => {
				// Create the graph with minimal state schema
				const graph = new StateGraph({}) as any

				// Generate node name from service tag
				const nodeId = tag.Identifier.toLowerCase()

				// Create a runnable from the node implementation
				const nodeRunnable = new RunnableLambda({
					func: nodeGenerator(model),
				})

				// Add the agent node with runnable
				graph.addNode(nodeId, nodeRunnable)

				// Add edges - simple linear flow
				graph.addEdge('__start__', nodeId)
				graph.addEdge(nodeId, '__end__')

				return graph
			}

			/**
			 * Process the input using the agent
			 */
			const process = (input: I) =>
				Effect.tryPromise({
					try: async () => {
						// Create and compile the graph
						const graph = createGraph().compile()

						// Add default timestamp if not provided
						const inputWithTimestamp = {
							...input,
							timestamp: (input as any).timestamp || currentIsoDateTimeString(),
						}

						// Invoke the graph with initial state
						const result = await graph.invoke({
							input: inputWithTimestamp,
							currentAgent: null,
							agentInputs: {},
							agentOutputs: {},
							executionLog: [],
							error: null,
						})

						// Return the output
						return (result as any).output as O
					},
					catch: error =>
						new AgentProcessingError({
							message: `Error processing with ${tag.Identifier}`,
							error,
						}),
				})

			return { process }
		}),
	)
}

/**
 * Create and execute a graph node with the provided implementation
 */
export function createGraphNode<I, O>(
	nodeId: string,
	nodeImpl: (state: BaseGraphState) => Promise<Partial<BaseGraphState>>,
	input: I,
): Effect.Effect<O, AgentProcessingError> {
	return Effect.tryPromise({
		try: async () => {
			// Create a simple graph
			const graph = new StateGraph({}) as any

			// Create a runnable from the node implementation
			const nodeRunnable = new RunnableLambda({
				func: nodeImpl,
			})

			// Add the agent node with runnable
			graph.addNode(nodeId, nodeRunnable)

			// Add edges
			graph.addEdge('__start__', nodeId)
			graph.addEdge(nodeId, END)

			// Add timestamp if needed
			const inputWithTimestamp = {
				...input,
				timestamp: (input as any).timestamp || currentIsoDateTimeString(),
			}

			// Compile and invoke
			const compiled = graph.compile()
			const result = await compiled.invoke({
				input: inputWithTimestamp,
				currentAgent: null,
				agentInputs: {},
				agentOutputs: {},
				executionLog: [],
				error: null,
			})

			// Return the output
			return (result as any).output as O
		},
		catch: error =>
			new AgentProcessingError({
				message: `Error processing with ${nodeId}`,
				error,
			}),
	})
}
