import type { StateGraph } from '@langchain/langgraph'
import { Context, Effect, Layer } from 'effect'

import type {
	ImpactInput,
	ImpactOutput,
	SimplifierInput,
	SimplifierOutput,
	SummarizerInput,
	SummarizerOutput,
} from '@pacto-chat/agents-domain'
import { ImpactAgent, SimplifierAgent, SummarizerAgent } from './agents'
import { ModelService } from './old_services/model'
import type { GraphStateDefinition } from './state'

export * from './state'
export * from './graph'
export * from './old_services/model'
export * from './agents'
export * from './utils/text_analysis'
export * from './utils/text_processing'

export interface AgentServices {
	simplifier: {
		createGraph: () => Effect.Effect<StateGraph<GraphStateDefinition>, never>
		execute: (input: SimplifierInput) => Effect.Effect<SimplifierOutput, Error>
	}
	summarizer: {
		createGraph: () => Effect.Effect<StateGraph<GraphStateDefinition>, never>
		execute: (input: SummarizerInput) => Effect.Effect<SummarizerOutput, Error>
	}
	impact: {
		createGraph: () => Effect.Effect<StateGraph<GraphStateDefinition>, never>
		execute: (input: ImpactInput) => Effect.Effect<ImpactOutput, Error>
	}
}

/**
 * AgentService tag for accessing all agents from a single service
 */
export class AgentService extends Context.Tag('AgentService')<
	AgentService,
	AgentServices
>() {
	static readonly Live = Layer.effect(
		AgentService,
		Effect.gen(function* () {
			const model = yield* ModelService
			const simplifierAgent = yield* SimplifierAgent
			const summarizerAgent = yield* SummarizerAgent
			const impactAgent = yield* ImpactAgent

			return {
				simplifier: {
					createGraph: simplifierAgent.createGraph,
					execute: (input: SimplifierInput) =>
						Effect.tryPromise({
							try: async () => {
								const result = await simplifierAgent.execute(
									{
										input,
										messages: [],
										executionLog: [],
									},
									model,
								)
								return result.output as SimplifierOutput
							},
							catch: error => new Error(`Simplifier error: ${error}`),
						}),
				},
				summarizer: {
					createGraph: summarizerAgent.createGraph,
					execute: (input: SummarizerInput) =>
						Effect.tryPromise({
							try: async () => {
								const result = await summarizerAgent.execute(
									{
										input,
										messages: [],
										executionLog: [],
									},
									model,
								)
								return result.output as SummarizerOutput
							},
							catch: error => new Error(`Summarizer error: ${error}`),
						}),
				},
				impact: {
					createGraph: impactAgent.createGraph,
					execute: (input: ImpactInput) =>
						Effect.tryPromise({
							try: async () => {
								const result = await impactAgent.execute(
									{
										input,
										messages: [],
										executionLog: [],
									},
									model,
								)
								return result.output as ImpactOutput
							},
							catch: error => new Error(`Impact assessment error: ${error}`),
						}),
				},
			}
		}),
	)
}
