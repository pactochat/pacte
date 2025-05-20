import {
	type AIMessage,
	type BaseMessage,
	HumanMessage,
} from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import {
	DynamicStructuredTool,
	DynamicTool,
	StructuredTool,
	tool,
} from '@langchain/core/tools'
import { END, START, StateGraph } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { z } from 'zod'

import type { BaseAgentInput, BaseAgentOutput } from '@pacto-chat/agents-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import { WorkflowState, type WorkflowStateType } from '../old_state'
import { qdrantClient } from '../utils/qdrant'

const agentModel = new ChatOpenAI({
	model: 'gpt-4o',
	temperature: 0,
	streaming: true,
})

/**
 * Helper to build a filter from metadata
 * @param metadata Optional metadata for building the filter
 * @returns Built filter
 */
function buildFilter(metadata?: Record<string, unknown>) {
	const must = []
	if (metadata) {
		for (const [key, value] of Object.entries(metadata)) {
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean'
			) {
				must.push({
					key: `metadata.${key}`,
					match: { value },
				})
			}
		}
	}
	return must.length > 0 ? { must } : undefined
}

// class ToolNews extends StructuredTool {
// 	name = 'multiply'
// 	description = 'Multiply two numbers together'
// 	schema = z.object({
// 		query: z.string().describe('The search query'),
// 	})

// 	async _call({ a, b }: { a: number; b: number }): Promise<string> {
// 		return (a * b).toString()
// 	}
// }

const toolNews = new DynamicStructuredTool({
	name: 'get_news',
	description: 'Search and return relevant city council information.',
	schema: z.object({
		query: z.string().describe('The search query'),
		city_council: z.string().describe('The city council name'),
	}),
	async func({ query, city_council }) {
		// embed the query
		const queryVector = await embeddings.embedQuery(query)

		const results = await qdrantClient.search('collectionName', {
			vector: queryVector,
			limit: 3,
		})
		return results.map(doc => doc.pageContent).join('\n---\n')
	},
})

const qdrantToolNode = new ToolNode<WorkflowStateType>([toolNews])

const toolTransformQuery = new DynamicTool({
	name: 'transform_query',
	description:
		'Transform a query to produce a better question for semantic search',
	func: async (question: string) => {
		logAgentsInfraLangchain.debug('---TRANSFORM QUERY---')
		const prompt = ChatPromptTemplate.fromTemplate(
			`You are generating a question that is well optimized for semantic search retrieval.
    Look at the input and try to reason about the underlying sematic intent / meaning.
    Here is the initial question:
    \n ------- \n
    {question} 
    \n ------- \n
    Formulate an improved question: `,
		)
		const chain = prompt.pipe(agentModel).pipe(new StringOutputParser())
		return chain.invoke({ question })
	},
})

const toolDecideToGenerate = new DynamicTool({
	name: 'decide_to_generate',
	description:
		"Decide whether to generate an answer or transform the query based on document availability. Input should be a JSON string with a 'documents' key containing an array of documents.",
	func: async (input: string): Promise<'transformQuery' | 'generate'> => {
		logAgentsInfraLangchain.debug('---DECIDE TO GENERATE---')
		const { documents } = JSON.parse(input)
		if (documents.length === 0) {
			logAgentsInfraLangchain.debug('---DECISION: TRANSFORM QUERY---')
			return 'transformQuery'
		}
		logAgentsInfraLangchain.debug('---DECISION: GENERATE---')
		return 'generate'
	},
})

const toolsNode = new ToolNode<WorkflowStateType>([
	toolNews,
	toolTransformQuery,
	toolDecideToGenerate,
])

const agentModelWithTools = agentModel.bindTools(toolsNode.tools)

const shouldRetrieve = (state: WorkflowStateType): string => {
	const lastMessage = state.messages[state.messages.length - 1]
	if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls) {
		return 'retrieve'
	}
	return END
}

const callAgent = async (state: WorkflowStateType) => {
	const messages = state.messages.filter(
		msg =>
			!('tool_calls' in msg) ||
			!msg.tool_calls ||
			!Array.isArray(msg.tool_calls) ||
			!msg.tool_calls.some(
				(tc: { name: string }) => tc.name === 'give_relevance_score',
			),
	)
	const response = await agentModelWithTools.invoke(messages)
	return { messages: [response] }
}

/**
 * Grades the relevance of retrieved documents to the user's query.
 * @param state Current workflow state.
 * @returns Effect that updates the state with a relevance score.
 */
const gradeDocuments = (state: WorkflowStateType) => {
	const messages = state.messages
	const tool = {
		name: 'give_relevance_score',
		description: 'Assign a relevance score to retrieved documents.',
		schema: z.object({
			binaryScore: z
				.enum(['yes', 'no'])
				.describe('Relevance score: "yes" or "no"'),
		}),
	}

	const prompt = ChatPromptTemplate.fromTemplate(`
You are a grader assessing the relevance of retrieved documents to a user question.
Here are the retrieved documents:
\n-------\n
{context}
\n-------\n
Here is the user question: {question}
Score the documents as relevant ('yes') or not relevant ('no') based on their content.
`)

	const model = new ChatOpenAI({
		model: 'gpt-4o',
		temperature: 0,
	}).bindTools([tool], { tool_choice: tool.name })

	const chain = prompt.pipe(model)
	const lastMessage = messages[messages.length - 1]
	const question = messages[0]?.content as string

	const score = chain.invoke({
		question,
		context: lastMessage?.content as string,
	})

	return { messages: [score] }
}

/**
 * Checks the relevance score of the documents.
 * @param state Current workflow state.
 * @returns 'yes' if relevant, 'no' if not.
 */
function checkRelevance(state: WorkflowStateType): string {
	const lastMessage = state.messages[state.messages.length - 1]
	if (!lastMessage || !('tool_calls' in lastMessage)) {
		throw new Error(
			"The 'checkRelevance' node requires tool calls in the most recent message.",
		)
	}
	const toolCalls = (lastMessage as AIMessage).tool_calls
	if (!toolCalls || !toolCalls.length) {
		throw new Error('Last message was not a function message')
	}
	return toolCalls[0]?.args.binaryScore === 'yes' ? 'yes' : 'no'
}

/**
 * Rewrites the query to improve clarity and specificity.
 * @param state Current workflow state.
 * @returns Effect that updates the state with a rewritten query.
 */
const rewriteQuery = (state: WorkflowStateType) => {
	const question = state.messages[0]?.content as string
	const prompt = ChatPromptTemplate.fromTemplate(`
Look at the input and reason about the underlying semantic intent.
Here is the initial question:
\n-------\n
{question}
\n-------\n
Formulate an improved question:
`)

	const model = new ChatOpenAI({
		model: 'gpt-4o',
		temperature: 0,
		streaming: true,
	})

	const response = prompt.pipe(model).invoke({ question })

	return { messages: [response] }
}

/**
 * Generates a final response using retrieved documents.
 * @param state Current workflow state.
 * @returns Effect that updates the state with the final response.
 */
async function generateResponse(state: WorkflowStateType) {
	const messages = state.messages
	const question = messages[0]?.content as string
	const lastToolMessage = messages
		.slice()
		.reverse()
		.find(msg => msg._getType() === 'tool')

	if (!lastToolMessage) {
		throw new Error('No tool message found in conversation history')
	}

	const docs = lastToolMessage.content as string
	const prompt = await import('langchain/hub').then(hub =>
		hub.pull<ChatPromptTemplate>('rlm/rag-prompt'),
	)

	const llm = new ChatOpenAI({
		model: 'gpt-4o',
		temperature: 0,
		streaming: true,
	})

	const ragChain = prompt.pipe(llm)
	const response = ragChain.invoke({ context: docs, question })

	return { messages: [response] }
}

/**
 * Creates the retrieval workflow graph.
 * @param input Agent input for initializing the retriever.
 * @returns Effect that resolves to a compiled StateGraph.
 */
export const createRetrievalWorkflow = (input: BaseAgentInput) => {
	const workflow = new StateGraph(WorkflowState).addNode('agent', callAgent)
	workflow
		.addNode('tools', toolsNode)
		.addNode('retrieve', qdrantToolNode)
		.addNode('gradeDocuments', gradeDocuments)
		.addNode('rewrite', rewriteQuery)
		.addNode('generate', generateResponse)

	workflow.addEdge(START, 'agent')
	workflow.addConditionalEdges('agent', shouldRetrieve)
	workflow.addEdge('retrieve', 'gradeDocuments')
	workflow.addConditionalEdges('gradeDocuments', checkRelevance, {
		yes: 'generate',
		no: 'rewrite',
	})
	workflow.addEdge('generate', END)
	workflow.addEdge('rewrite', 'agent')

	return workflow.compile()
}

/**
 * Runs the retrieval workflow with the provided input.
 * @param input The agent input containing the query.
 * @returns Effect that resolves to the workflow state.
 */
export const runRetrievalWorkflow = (
	input: BaseAgentInput,
): Promise<Partial<WorkflowStateType>> => {
	const workflow = createRetrievalWorkflow(input)
	const initialState = {
		input,
		messages: [new HumanMessage(input.question)],
		currentStep: 'agent',
		error: null,
	}

	const finalState = workflow.invoke(initialState)

	return finalState
}

/**
 * Streams the retrieval workflow for incremental updates.
 * @param input The agent input containing the query.
 * @yields Incremental state updates.
 */
export async function* streamRetrievalWorkflow(input: BaseAgentInput) {
	const workflow = createRetrievalWorkflow(input)

	const initialState: Partial<WorkflowStateType> = {
		input,
		messages: [new HumanMessage(input.question)],
		currentStep: 'agent',
		error: null,
	}

	for await (const chunk of await workflow.stream(initialState)) {
		const processedChunk = processChunk(chunk, input)
		if (processedChunk) {
			yield processedChunk
		}
	}
}
