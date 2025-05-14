import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { StateGraph } from '@langchain/langgraph'
import type { ChatOpenAI } from '@langchain/openai'
// src/agents/simplifier.ts
import { Context, Effect, Layer } from 'effect'

import type {
	SimplifierInput,
	SimplifierOutput,
} from '@pacto-chat/agents-domain'
import { nowZoned } from '@pacto-chat/shared-domain'
import { GraphService } from '../graph'
import { ModelService } from '../old_services/model'
import type { BaseGraphState } from '../state'
import { calculateComplexityScore } from '../utils/text-analysis'

/**
 * Simplifier agent service
 */
export class SimplifierAgent extends Context.Tag('SimplifierAgent')<
	SimplifierAgent,
	{
		/**
		 * Create a graph for text simplification
		 */
		createGraph: () => Effect.Effect<StateGraph, never>

		/**
		 * Execute the simplification logic
		 */
		execute: (
			state: BaseGraphState,
			model: ChatOpenAI,
		) => Promise<Partial<BaseGraphState>>
	}
>() {
	/**
	 * Create the simplifier node implementation
	 */
	private static simplifierNode = (
		state: BaseGraphState,
		model: ChatOpenAI,
	): Promise<Partial<BaseGraphState>> => {
		return Effect.gen(function* ($) {
			// Get input from state
			const input = state.input as SimplifierInput
			const targetLevel = input.targetLevel || 'middle'
			const preserveKeyTerms = input.preserveKeyTerms || []

			// Calculate original complexity score
			const originalComplexityScore = calculateComplexityScore(input.text)

			// Create prompt
			const prompt = ChatPromptTemplate.fromTemplate(`
        You are an expert at simplifying complex text while preserving meaning. 
        Simplify the following text to a {targetLevel} school reading level.
        
        The text should be easy to understand for someone at a {targetLevel} school education level,
        but still retain all the important information and key concepts.
        
        The following key terms should be preserved as-is (you can explain them if needed):
        {preserveKeyTerms}
        
        Original text:
        {text}
        
        Simplified text:
      `)

			// Create chain
			const chain = prompt.pipe(model)

			// Log messages for tracing
			const messages: BaseMessage[] = [
				new HumanMessage(
					`Simplify the following text to ${targetLevel} level: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
				),
			]

			// Execute the chain
			const response = yield* $(
				Effect.promise(() =>
					chain.invoke({
						text: input.text,
						targetLevel,
						preserveKeyTerms: preserveKeyTerms.join(', ') || 'None specified',
					}),
				),
			)

			// Add response to messages
			messages.push(response)

			// Create the simplified text
			const simplifiedText = response.content as string

			// Calculate result complexity score
			const resultComplexityScore = calculateComplexityScore(simplifiedText)

			// Create the output
			const output: SimplifierOutput = {
				text: simplifiedText,
				originalText: input.text,
				targetLevel: targetLevel,
				originalComplexityScore,
				resultComplexityScore,
				preservedTerms: preserveKeyTerms,
				language: input.language,
				timestamp: nowZoned().toString(),
			}

			// Return updated state
			return {
				output,
				agentOutputs: { simplifier: output },
				messages,
			}
		}).execute()
	}

	/**
	 * Live implementation of the SimplifierAgent
	 */
	static readonly Live = Layer.effect(
		SimplifierAgent,
		Effect.gen(function* ($) {
			const graphService = yield* $(GraphService)

			return {
				createGraph: () =>
					Effect.sync(() => {
						const graph = graphService.createGraph('simplifier')

						// Add the simplifier node with wrapped execution function
						graph.addNode('simplifier', state =>
							Effect.runPromise(
								graphService.executeNode(
									'simplifier',
									SimplifierAgent.simplifierNode,
								)(state),
							),
						)

						// Define the graph flow
						graph.addEdge('__start__', 'simplifier')
						graph.addEdge('simplifier', '__end__')

						// Return the compiled graph
						return graph.compile()
					}),

				execute: SimplifierAgent.simplifierNode,
			}
		}),
	)
}
