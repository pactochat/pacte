import { END, START, StateGraph } from '@langchain/langgraph'

import type {
	BaseAgentInput,
	BaseAgentOutput,
	RouterInput,
} from '@pacto-chat/agents-domain'
import {
	createImpactAgent,
	createSimplifierAgent,
	createSummarizerAgent,
} from '../agents'
import { WorkflowState, type WorkflowStateType } from '../state'

/**
 * Creates a simplified direct workflow without a router.
 * This workflow follows a fixed sequence: summarizer -> impact -> simplifier
 */
export const createRoutedWorkflow = () => {
	const graph = new StateGraph(WorkflowState)

	// Add agents
	graph.addNode('summarizer', createSummarizerAgent())
	graph.addNode('impact', createImpactAgent())
	graph.addNode('simplifier', createSimplifierAgent())

	// Add direct connections between agents for a fixed flow
	graph.addEdge(START, 'summarizer' as any)
	graph.addEdge('summarizer' as any, 'impact' as any)
	graph.addEdge('impact' as any, 'simplifier' as any)
	graph.addEdge('simplifier' as any, END)

	return graph.compile()
}

// Type guard to check if input is RouterInput
function isRouterInput(input: any): input is RouterInput {
	return 'availableAgents' in input
}

/**
 * Runs the workflow with the given input
 * @param input An agent input or router input
 * @returns The workflow result
 */
export const runRoutedWorkflow = async (
	input: BaseAgentInput,
): Promise<WorkflowStateType> => {
	const workflow = createRoutedWorkflow()

	// Initialize the state with the input
	const initialState: Partial<WorkflowStateType> = {
		input,
		currentStep: 'summarizer',
	}

	// Run the workflow
	const result = await workflow.invoke(initialState)

	return result
}

/**
 * Helper function to create a final output from the workflow state
 * @param state The workflow state
 * @param input The original input
 * @returns A properly formatted agent output
 */
export function createFinalOutput(
	state: WorkflowStateType,
	input: BaseAgentInput,
): BaseAgentOutput {
	let text = ''
	const metadata: Record<string, unknown> = {}

	// Use the most processed form of the text
	if (state.simplifier) {
		text = state.simplifier.text
		metadata.simplifier = {
			targetLevel: state.simplifier.targetLevel,
			complexityReduction:
				state.simplifier.originalComplexityScore -
				state.simplifier.resultComplexityScore,
		}
	} else if (state.impact) {
		text = state.impact.text
		metadata.impact = {
			overallScore: state.impact.overallImpact,
			dimensions: state.impact.impacts.map(imp => ({
				type: imp.type,
				score: imp.score,
			})),
		}
	} else if (state.summarizer) {
		text = state.summarizer.text
		metadata.summary = {
			keyPoints: state.summarizer.keyPoints,
			length: state.summarizer.length,
			format: state.summarizer.format,
		}
	} else {
		// If no processing occurred, return the original text
		text = input.intent
	}

	// Add workflow history if available
	if (state.messages && state.messages.length > 0) {
		metadata.workflow = {
			steps: state.messages,
		}
	}

	return {
		text,
		language: input.language,
		metadata,
	}
}

/**
 * Stream the workflow execution
 * @param input The agent input
 */
export const streamWorkflow = async function* (input: BaseAgentInput) {
	const workflow = createRoutedWorkflow()

	// Initialize the state with the input
	let initialState: Partial<WorkflowStateType>

	// Check if input contains router-specific fields
	if (isRouterInput(input)) {
		initialState = { input }
	} else {
		// If not a router input, create one
		const routerInput: RouterInput = {
			...input,
			availableAgents: ['summarizer', 'impact', 'simplifier'],
		}
		initialState = { input: routerInput }
	}

	// Stream the workflow execution
	for await (const chunk of await workflow.stream(initialState)) {
		yield chunk
	}
}
