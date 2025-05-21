import { RunnableLambda } from '@langchain/core/runnables'
import { END, START, StateGraph } from '@langchain/langgraph'
import type { CompiledGraph } from '@langchain/langgraph'

import { simplifierAgentGraph } from '../simplifier'
import { summarizerAgentGraph } from '../summarizer'
import { generalHandler } from './nodes/general_handler'
import { supervisorNode } from './nodes/router'
import { SupervisorAnnotation, type SupervisorState } from './types'

const AGENT_NAMES = ['summarizer', 'simplifier', 'general'] as const
type AgentName = (typeof AGENT_NAMES)[number]

// Create the supervisor agent graph (agent supervisor loop)
const workflow = new StateGraph(SupervisorAnnotation)
	.addNode('supervisor', supervisorNode)
	.addNode('summarizer', summarizerAgentGraph)
	.addNode('simplifier', simplifierAgentGraph)
	.addNode('general', generalHandler)

	// Connections: supervisor -> agent
	.addConditionalEdges(
		'supervisor',
		RunnableLambda.from((state: SupervisorState) => state.next),
		[...AGENT_NAMES, END],
	)
	.addEdge(START, 'supervisor')

// Connections: agent -> supervisor
for (const agent of AGENT_NAMES) {
	workflow.addEdge(agent, 'supervisor')
}

export const supervisorAgentGraph: CompiledGraph<
	AgentName | 'supervisor' | typeof START
> = workflow.compile()

export { type SupervisorState, SupervisorAnnotation }
