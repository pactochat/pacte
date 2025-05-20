import { END, START, StateGraph } from '@langchain/langgraph'

import { simplifyTextNode } from './nodes/simplify_text'
import { SimplifierAgentState, type SimplifierAgentStateType } from './types'

const simplifierAgentGraph = new StateGraph(SimplifierAgentState)
	.addNode('simplifyText', simplifyTextNode)
	.addEdge(START, 'simplifyText')
	.addEdge('simplifyText', END)
	.compile()

export { simplifierAgentGraph, type SimplifierAgentStateType }
