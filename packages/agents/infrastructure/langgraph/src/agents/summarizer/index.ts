import { END, START, StateGraph } from '@langchain/langgraph'

import { retrieveDocumentsNode } from './nodes/retrieve_documents'
import { summarizeRetrievedContentNode } from './nodes/summarize_retrieved_content'
import { SUMMARIZER_PROMPT_TEMPLATE } from './nodes/summarize_retrieved_content'
import { SummarizerAgentState, type SummarizerAgentStateType } from './types'

const summarizerAgentGraph = new StateGraph(SummarizerAgentState)
	.addNode('retrieveDocuments', retrieveDocumentsNode)
	.addNode('summarizeRetrievedContent', summarizeRetrievedContentNode)
	.addEdge(START, 'retrieveDocuments')
	.addEdge('retrieveDocuments', 'summarizeRetrievedContent')
	.addEdge('summarizeRetrievedContent', END)
	.compile()

export { summarizerAgentGraph, SUMMARIZER_PROMPT_TEMPLATE }
export type { SummarizerAgentStateType }
