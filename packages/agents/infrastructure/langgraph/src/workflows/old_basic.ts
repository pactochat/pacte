import { END, START, StateGraph } from '@langchain/langgraph'

import type { BaseAgentInput } from '@pacto-chat/agents-domain'
import {
	createImpactAgent,
	createSimplifierAgent,
	createSummarizerAgent,
} from '../agents'
import { WorkflowState, type WorkflowStateType } from '../old_state'

export const createBasicWorkflow = () => {
	const graph = new StateGraph(WorkflowState)

	// Add agents
	graph.addNode('summarizer', createSummarizerAgent())
	graph.addNode('impact', createImpactAgent())
	graph.addNode('simplifier', createSimplifierAgent())

	// Add connections between agents
	graph.addEdge(START, 'summarizer')
	graph.addConditionalEdges('summarizer', state => state.currentStep, {
		impact: 'impact',
		end: END,
	})
	graph.addConditionalEdges('impact', state => state.currentStep, {
		simplifier: 'simplifier',
		end: END,
	})
	graph.addConditionalEdges('simplifier', state => state.currentStep, {
		end: END,
	})

	return graph.compile()
}

export const runBasicWorkflow = async (input: BaseAgentInput) => {
	const workflow = createBasicWorkflow()

	const initialState: Partial<WorkflowStateType> = {
		input,
	}

	// Run the workflow
	const result = await workflow.invoke(initialState)

	return result
}
