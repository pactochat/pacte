import { END, START, StateGraph } from '@langchain/langgraph'

import { createPlanNode } from './nodes/create_plan'
import { PlannerAgentState, type PlannerAgentStateType } from './types'

const plannerAgentGraph = new StateGraph(PlannerAgentState)
	.addNode('createPlan', createPlanNode)
	.addEdge(START, 'createPlan')
	.addEdge('createPlan', END)
	.compile()

export { plannerAgentGraph, type PlannerAgentStateType }
