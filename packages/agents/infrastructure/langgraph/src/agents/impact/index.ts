import { END, START, StateGraph } from '@langchain/langgraph'

import { analyzeImpactNode } from './nodes/analyze_impact'
import { ImpactAgentState, type ImpactAgentStateType } from './types'

const impactAgentGraph = new StateGraph(ImpactAgentState)
	.addNode('analyzeImpact', analyzeImpactNode)
	.addEdge(START, 'analyzeImpact')
	.addEdge('analyzeImpact', END)
	.compile()

export { impactAgentGraph, type ImpactAgentStateType }
