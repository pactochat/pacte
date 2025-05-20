import { END, START, StateGraph } from '@langchain/langgraph'

import { SystemMessage } from '@langchain/core/messages'
import type { BaseAgentInput } from '@pacto-chat/agents-domain'
import {
	createImpactAgent,
	createSimplifierAgent,
	createSummarizerAgent,
} from '../agents'
import { WorkflowState, type WorkflowStateType } from '../old_state'
import { createFinalOutput } from './old_routed'

/**
 * Creates a direct workflow with a fixed sequence of agents.
 * This workflow follows a simple path: summarizer -> impact -> simplifier
 */
export const createDirectWorkflow = () => {
	// Create the graph
	const graph = new StateGraph(WorkflowState)

	// Add agents
	graph.addNode('summarizer', createSummarizerAgent())
	graph.addNode('impact', createImpactAgent())
	graph.addNode('simplifier', createSimplifierAgent())

	// Add connections between agents
	graph.addEdge(START, 'summarizer')
	graph.addEdge('summarizer', 'impact')
	graph.addEdge('impact', 'simplifier')
	graph.addEdge('simplifier', END)

	// Compile the graph into a runnable
	return graph.compile()
}

/**
 * Runs the direct workflow with the given input
 * @param input The agent input
 * @returns The workflow result
 */
export const runDirectWorkflow = async (
	input: BaseAgentInput,
): Promise<WorkflowStateType> => {
	const workflow = createDirectWorkflow()

	// Initialize the state with the input
	const initialState: Partial<WorkflowStateType> = {
		input,
		messages: [
			new SystemMessage(
				'Starting direct workflow: summarizer → impact → simplifier',
			),
		],
	}

	// Run the workflow
	const result = await workflow.invoke(initialState)

	return result
}

/**
 * Process text using the direct workflow
 * @param input The agent input
 * @returns The final agent output
 */
export const processTextDirect = async (input: BaseAgentInput) => {
	try {
		const result = await runDirectWorkflow(input)

		if (result.error) {
			throw new Error(result.error)
		}

		if (!result.output) {
			return createFinalOutput(result, input)
		}

		return result.output
	} catch (error) {
		return {
			text: 'An error occurred during processing',
			metadata: {
				error: error instanceof Error ? error.message : 'Unknown error',
			},
		}
	}
}
