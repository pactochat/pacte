import { END, START, StateGraph } from '@langchain/langgraph'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'

import { impactAgentGraph } from '../impact'
import { plannerAgentGraph } from '../planner'
import { simplifierAgentGraph } from '../simplifier'
import { summarizerAgentGraph } from '../summarizer'
import { generalHandler } from './nodes/general-handler'
import { router } from './nodes/router'
import {
	SupervisorAnnotation,
	type SupervisorState,
	SupervisorZodConfiguration,
} from './types'

/**
 * Routes the request to the appropriate agent based on the next value
 */
function handleRoute(state: SupervisorState): string {
	logAgentsInfraLangchain.debug(
		`[Supervisor.handleRoute] Routing to ${state.next}`,
		{ languageDetected: state.languageDetected },
	)
	return state.next
}

/**
 * Create the supervisor agent graph
 */
export const supervisorAgentGraph = new StateGraph(
	SupervisorAnnotation,
	SupervisorZodConfiguration,
)
	// Agents
	.addNode('router', router)
	.addNode('summarizer', summarizerAgentGraph)
	.addNode('impact', impactAgentGraph)
	.addNode('simplifier', simplifierAgentGraph)
	.addNode('planner', plannerAgentGraph)
	.addNode('general', generalHandler)

	// Edges
	.addEdge(START, 'router')
	.addConditionalEdges('router', handleRoute, [
		'summarizer',
		'impact',
		'simplifier',
		'planner',
		'general',
	])
	.addEdge('summarizer', END)
	.addEdge('impact', END)
	.addEdge('simplifier', END)
	.addEdge('planner', END)
	.addEdge('general', END)
	.compile()

export {
	type SupervisorState,
	SupervisorAnnotation,
	SupervisorZodConfiguration,
}
