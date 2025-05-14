import { RunnableLambda } from '@langchain/core/runnables'
import { StateGraph } from '@langchain/langgraph'
import { END } from '@langchain/langgraph'
import { Context, Effect, Layer } from 'effect'

import type {
	AgentInput,
	AgentType,
	RephraserInput,
	RephraserOutput,
	RouterOutput,
} from '@pacto-chat/agents-domain'
import { uuid } from '@pacto-chat/shared-domain'
import { currentIsoDateTimeString } from '@pacto-chat/shared-domain'
import {
	LegalGapService,
	PlannerService,
	RouterService,
	SimplifierService,
	SummarizerService,
} from '.'
import type { BaseGraphState } from '../old_state'
import { AgentProcessingError } from './errors'
import { ImpactService } from './impact'
import { ModelService } from './model'
import { RephraserService } from './rephraser'
import { compileGraph } from './utils'

export class WorkflowService extends Context.Tag('WorkflowService')<
	WorkflowService,
	{
		executeSequence: (
			input: RephraserInput,
			sequence: AgentType[],
		) => Effect.Effect<RephraserOutput, AgentProcessingError>

		executeWithRouter: (
			input: RephraserInput,
		) => Effect.Effect<RephraserOutput, AgentProcessingError>
	}
>() {
	static readonly Live = Layer.effect(
		WorkflowService,
		Effect.gen(function* () {
			const rephraser = yield* RephraserService
			const simplifier = yield* SimplifierService
			const summarizer = yield* SummarizerService
			const impact = yield* ImpactService
			const planner = yield* PlannerService
			const legalGap = yield* LegalGapService
			const router = yield* RouterService
			const model = yield* ModelService

			/**
			 * Map of agent services by type
			 */
			const agentServices = {
				rephraser,
				simplifier,
				summarizer,
				impact,
				planner,
				legalGap,
				router,
			}

			/**
			 * Create a sequential workflow graph
			 */
			const createSequentialGraph = (sequence: AgentType[]) => {
				// Create the graph
				const graph = new StateGraph({}) as any

				// Validate sequence
				if (sequence.length === 0) {
					throw new AgentProcessingError({
						message:
							'Sequential workflow requires at least one agent in the sequence',
					})
				}

				// Add nodes for all agents in the sequence
				for (const agentType of sequence) {
					if (!(agentType in agentServices)) {
						throw new AgentProcessingError({
							message: `Agent type ${agentType} not available`,
						})
					}

					// Create a node function that processes with the agent
					const nodeFunction = async (state: BaseGraphState) => {
						try {
							// Log execution start
							const startLog = {
								agent: agentType,
								timestamp: currentIsoDateTimeString(),
								status: 'started',
							}

							// Create a copy of the input with appropriate data
							const agentInput = state.agentInputs?.[agentType] || state.input

							// Process with the appropriate agent service using type casting to avoid errors
							const result = await Effect.runPromise(
								(agentServices[agentType] as any).process(agentInput),
							)

							// Log completion
							const completeLog = {
								agent: agentType,
								timestamp: currentIsoDateTimeString(),
								status: 'completed',
							}

							// Update state with agent result
							return {
								output: result,
								agentOutputs: {
									...state.agentOutputs,
									[agentType]: result,
								},
								executionLog: [startLog, completeLog],
							}
						} catch (error) {
							// Log error
							const errorLog = {
								agent: agentType,
								timestamp: currentIsoDateTimeString(),
								status: 'failed',
							}

							// Return error state
							return {
								error: `Error in ${agentType}: ${error}`,
								executionLog: [errorLog],
							}
						}
					}

					// Wrap the node function in a RunnableLambda
					const nodeRunnable = new RunnableLambda({ func: nodeFunction })

					// Add the node to the graph
					graph.addNode(agentType, nodeRunnable)
				}

				// Add edges for the sequence
				graph.addEdge('__start__', sequence[0])

				for (let i = 0; i < sequence.length - 1; i++) {
					graph.addEdge(sequence[i], sequence[i + 1])
				}

				graph.addEdge(sequence[sequence.length - 1], '__end__')

				// Add conditional routing for error handling
				for (const agentType of sequence) {
					// If an agent produces an error, go to the end
					graph.addConditionalEdges(agentType, (state: BaseGraphState) => {
						if (state.error) {
							return END
						}
						// Otherwise continue with the normal flow
						return null
					})
				}

				return graph
			}

			/**
			 * Create a router-based workflow graph
			 */
			const createRouterGraph = () => {
				// Create the graph
				const graph = new StateGraph({}) as any

				// Add the router node
				const routerNodeFunction = async (state: BaseGraphState) => {
					try {
						// Create router input with available agents
						const routerInput = {
							...state.input,
							availableAgents: Object.keys(agentServices).filter(
								agent => agent !== 'router',
							) as AgentType[],
						}

						// Log execution start
						const startLog = {
							agent: 'router',
							timestamp: currentIsoDateTimeString(),
							status: 'started',
						}

						// Process with router
						const result = (await Effect.runPromise(
							(router as any).process(routerInput),
						)) as RouterOutput

						// Log completion
						const completeLog = {
							agent: 'router',
							timestamp: currentIsoDateTimeString(),
							status: 'completed',
						}

						// Determine next agent
						let nextAgent = result.nextAgent
						if (Array.isArray(nextAgent)) {
							nextAgent = nextAgent.length > 0 ? nextAgent[0] : null
						}

						// Update state
						return {
							agentOutputs: { router: result },
							currentAgent: nextAgent as AgentType | null,
							executionLog: [startLog, completeLog],
						}
					} catch (error) {
						// Log error
						const errorLog = {
							agent: 'router',
							timestamp: currentIsoDateTimeString(),
							status: 'failed',
						}

						// Return error state
						return {
							error: `Error in router: ${error}`,
							executionLog: [errorLog],
						}
					}
				}

				// Add router node with runnable
				graph.addNode(
					'router',
					new RunnableLambda({ func: routerNodeFunction }),
				)

				// Add all available agent nodes (except router)
				for (const [agentType, service] of Object.entries(agentServices)) {
					if (agentType !== 'router') {
						// Create a node function that processes with the agent
						const nodeFunction = async (state: BaseGraphState) => {
							try {
								// Log execution start
								const startLog = {
									agent: agentType,
									timestamp: currentIsoDateTimeString(),
									status: 'started',
								}

								// Create a copy of the input with appropriate data
								const agentInput = state.agentInputs?.[agentType] || state.input

								// Process with the appropriate agent service
								const result = await Effect.runPromise(
									(service as any).process(agentInput),
								)

								// Log completion
								const completeLog = {
									agent: agentType,
									timestamp: currentIsoDateTimeString(),
									status: 'completed',
								}

								// Update state with agent result
								return {
									output: result,
									agentOutputs: {
										...state.agentOutputs,
										[agentType]: result,
									},
									executionLog: [startLog, completeLog],
								}
							} catch (error) {
								// Log error
								const errorLog = {
									agent: agentType,
									timestamp: currentIsoDateTimeString(),
									status: 'failed',
								}

								// Return error state
								return {
									error: `Error in ${agentType}: ${error}`,
									executionLog: [errorLog],
								}
							}
						}

						// Add the agent node
						graph.addNode(
							agentType as AgentType,
							new RunnableLambda({ func: nodeFunction }),
						)

						// All agent nodes go to the end after execution
						graph.addEdge(agentType as AgentType, '__end__')
					}
				}

				// Add the conditional router edge to route to different agents
				graph.addConditionalEdges('router', (state: BaseGraphState) => {
					// If there's an error, go to the end
					if (state.error) {
						return END
					}

					// Go to the selected agent or end if none selected
					return state.currentAgent || END
				})

				// Start the graph with the router
				graph.addEdge('__start__', 'router')

				return graph
			}

			/**
			 * Execute a sequential workflow
			 */
			const executeSequence = <I extends AgentInput, O>(
				input: I,
				sequence: AgentType[],
			) =>
				Effect.tryPromise({
					try: async () => {
						// Create workflow ID
						const workflowId = uuid()

						// Create and compile the sequential graph
						const graph = await Effect.runPromise(
							compileGraph(createSequentialGraph(sequence)),
						)

						// Add default timestamp if not provided
						const inputWithTimestamp = {
							...input,
							timestamp: (input as any).timestamp || currentIsoDateTimeString(),
						}

						// Invoke the graph with input
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
							message: 'Error executing sequential workflow',
							error,
						}),
				})

			/**
			 * Execute a router-based workflow
			 */
			const executeWithRouter = <I extends AgentInput, O>(input: I) =>
				Effect.tryPromise({
					try: async () => {
						// Create workflow ID
						const workflowId = uuid()

						// Create and compile the router graph
						const graph = await Effect.runPromise(
							compileGraph(createRouterGraph()),
						)

						// Add default timestamp if not provided
						const inputWithTimestamp = {
							...input,
							timestamp: (input as any).timestamp || currentIsoDateTimeString(),
						}

						// Invoke the graph with input
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
							message: 'Error executing router workflow',
							error,
						}),
				})

			// Return the service implementation
			return {
				executeSequence,
				executeWithRouter,
			}
		}),
	)
}
