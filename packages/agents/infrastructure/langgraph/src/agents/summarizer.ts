import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { StateGraph } from '@langchain/langgraph'
import type { ChatOpenAI } from '@langchain/openai'
import { Context, Effect, Layer } from 'effect'

import type {
	SummarizerInput,
	SummarizerOutput,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import { GraphService } from '../graph'
import type { BaseGraphState } from '../state'
import { extractKeyPoints } from '../utils/text_analysis'

/**
 * Summarizer agent service
 */
export class SummarizerAgent extends Context.Tag('SummarizerAgent')<
	SummarizerAgent,
	{
		/**
		 * Create a graph for text summarization
		 */
		createGraph: () => Effect.Effect<StateGraph, never>

		/**
		 * Execute the summarization logic
		 */
		execute: (
			state: BaseGraphState,
			model: ChatOpenAI,
		) => Promise<Partial<BaseGraphState>>
	}
>() {
	/**
	 * Create the summarizer node implementation
	 */
	private static summarizerNode = (
		state: BaseGraphState,
		model: ChatOpenAI,
	): Promise<Partial<BaseGraphState>> => {
		return Effect.gen(function* () {
			// Get input from state
			const input = state.input as SummarizerInput
			const maxLength = input.maxLength || 1000
			const preserveKeyPoints = input.preserveKeyPoints || []
			const format = input.format || 'paragraph'

			// Create prompt
			const prompt = ChatPromptTemplate.fromTemplate(`
        You are an expert summarizer. Create a concise summary of the following text in {format} format.
        The summary should be no longer than {maxLength} characters.
        
        Make sure that these key points are included in the summary:
        {preserveKeyPoints}
        
        Maintain the main ideas, important details, and overall message of the original text.
        
        Original text:
        {text}
        
        {format} summary:
      `)

			// Create chain
			const chain = prompt.pipe(model)

			// Log messages for tracing
			const messages: BaseMessage[] = [
				new HumanMessage(
					`Summarize the following text in ${format} format: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
				),
			]

			// Execute the chain
			const response = yield* Effect.promise(() =>
				chain.invoke({
					text: input.text,
					maxLength,
					preserveKeyPoints: preserveKeyPoints.join('\n- ') || 'None specified',
					format,
				}),
			)

			// Add response to messages
			messages.push(response)

			// Create the summary text
			const summaryText = response.content as string

			// Extract key points if not provided
			const keyPoints =
				preserveKeyPoints.length > 0
					? preserveKeyPoints
					: extractKeyPoints(input.text, 5)

			// Calculate compression ratio
			const compressionRatio = summaryText.length / input.text.length

			// Estimate reading time (average 200 words per minute)
			const words = summaryText.split(/\s+/).length
			const readingTime = Math.ceil((words / 200) * 60) // in seconds

			// Create the output
			const output: SummarizerOutput = {
				text: summaryText,
				originalText: input.text,
				keyPoints,
				length: summaryText.length,
				readingTime,
				format: format,
				compressionRatio,
				language: input.language,
				timestamp: nowZoned().toString() as ZonedDateTimeString,
			}

			// Return updated state
			return {
				output,
				agentOutputs: { summarizer: output },
				messages,
			}
		}).execute()
	}

	/**
	 * Live implementation of the SummarizerAgent
	 */
	static readonly Live = Layer.effect(
		SummarizerAgent,
		Effect.gen(function* ($) {
			const graphService = yield* $(GraphService)

			return {
				createGraph: () =>
					Effect.sync(() => {
						const graph = graphService.createGraph('summarizer')

						// Add the summarizer node with wrapped execution function
						graph.addNode('summarizer', state =>
							Effect.runPromise(
								graphService.executeNode(
									'summarizer',
									SummarizerAgent.summarizerNode,
								)(state),
							),
						)

						// Define the graph flow
						graph.addEdge('__start__', 'summarizer')
						graph.addEdge('summarizer', '__end__')

						// Return the compiled graph
						return graph.compile()
					}),

				execute: SummarizerAgent.summarizerNode,
			}
		}),
	)
}
