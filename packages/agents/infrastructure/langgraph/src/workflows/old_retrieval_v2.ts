// packages/agents/infrastructure/langgraph/src/workflows/enhanced-retrieval.ts

import {
	type AIMessage,
	type BaseMessage,
	HumanMessage,
	SystemMessage,
} from '@langchain/core/messages'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools'
import { END, START, StateGraph } from '@langchain/langgraph'
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

import type { BaseAgentInput } from '@pacto-chat/agents-domain'
import { ListLanguageCodes } from '@pacto-chat/shared-domain'
import { logAgentsInfraLangchain } from '@pacto-chat/shared-utils-logging'
import { WorkflowState, type WorkflowStateType } from '../old_state'
import {
	getLanguageSpecificPrompt,
	transformQueryTool,
} from '../tools/language'
import { detectLanguage, detectLanguageTool } from '../tools/language_detector'
import { languageAwareEmbeddings } from '../utils/embedding_robertaca'
import { qdrantClient } from '../utils/qdrant'
import {
	createWorkflowLogger,
	formatRetrievalResults,
	getLocalizedErrorMessage,
	languageTrackingMiddleware,
} from '../utils/workflow_middleware'

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

/**
 * Tool for retrieving city council information using semantic search
 * Uses language-aware embeddings to select the appropriate embedding model
 */
const zodSchema = z.object({
	query: z.string().describe('The search query'),
	city_council: z.string().describe('The city council name'),
})

const jsonSchema = zodToJsonSchema(zodSchema)

const cityCouncilSearchTool = new DynamicStructuredTool({
	name: 'get_city_council_info',
	description: 'Search and return relevant city council information.',
	schema: jsonSchema,
	async func({ query, city_council }: { query: string; city_council: string }) {
		try {
			logAgentsInfraLangchain.debug('Searching city council info', {
				query,
				city_council,
			})

			// Detect language of the query
			const language = await detectLanguage(query)
			logAgentsInfraLangchain.debug('Language detection result', {
				language,
				query,
			})

			// Use language-aware embeddings which will select the appropriate model
			const queryVector = await languageAwareEmbeddings.embedQuery(query)

			// Build filter to include city council
			const filter = buildFilter({ city_council })

			// Search in Qdrant
			const results = await qdrantClient.search('collectionName', {
				vector: queryVector,
				limit: 3,
				// filter,
			})

			// Format the results based on the detected language
			return formatRetrievalResults(results, language)
		} catch (error) {
			logAgentsInfraLangchain.error('Error in city council search tool', {
				error,
			})

			// Get appropriate error message based on language
			const language = await detectLanguage(query)
			return getLocalizedErrorMessage('server_error', language)
		}
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

// Combine all tools
const allTools = [
	cityCouncilSearchTool,
	transformQueryTool,
	detectLanguageTool,
	toolDecideToGenerate,
]

const toolsNode = new ToolNode<WorkflowStateType>(allTools)
const qdrantToolNode = new ToolNode<WorkflowStateType>([cityCouncilSearchTool])

const agentModelWithTools = agentModel.bindTools(toolsNode.tools)

const shouldRetrieve = (state: WorkflowStateType): string => {
	const lastMessage = state.messages[state.messages.length - 1]
	if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls) {
		return 'retrieve'
	}
	return END
}

const callAgent = async (state: WorkflowStateType) => {
	// Get the detected language
	const language = state.languageDetected

	// Filter out relevance scoring messages
	const messages = state.messages.filter(
		msg =>
			!('tool_calls' in msg) ||
			!msg.tool_calls ||
			!Array.isArray(msg.tool_calls) ||
			!msg.tool_calls.some(
				(tc: { name: string }) => tc.name === 'give_relevance_score',
			),
	)

	// Add a system message with language-specific instructions
	const systemInstructions = {
		cat: 'Ets un assistent municipal intel·ligent. Ajuda els ciutadans a trobar informació del seu ajuntament. Utilitza les eines disponibles per a buscar informació rellevant.',
		spa: 'Eres un asistente municipal inteligente. Ayuda a los ciudadanos a encontrar información de su ayuntamiento. Utiliza las herramientas disponibles para buscar información relevante.',
		eng: 'You are an intelligent municipal assistant. Help citizens find information about their city council. Use the available tools to search for relevant information.',
	}

	const systemMessage = new SystemMessage(
		systemInstructions[language] || systemInstructions.eng,
	)

	// Add system message at the beginning if not already present
	if (messages.length > 0 && messages[0]._getType() !== 'system') {
		messages.unshift(systemMessage)
	}

	const response = await agentModelWithTools.invoke(messages)
	return { messages: [response] }
}

/**
 * Grades the relevance of retrieved documents to the user's query.
 * @param state Current workflow state.
 * @returns Effect that updates the state with a relevance score.
 */
const gradeDocuments = async (state: WorkflowStateType) => {
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

	// Get the original question and detected language from state
	const question = messages[0]?.content as string
	const language = state.languageDetected

	// Get language-specific prompt for grading documents
	let promptTemplate: string

	switch (language) {
		case ListLanguageCodes.cat:
			promptTemplate = `
Ets un avaluador que comprova la rellevància dels documents recuperats per a una pregunta d'usuari.
Aquí tens els documents recuperats:
\n-------\n
{context}
\n-------\n
Aquí tens la pregunta de l'usuari: {question}
Avalua si els documents són rellevants ('yes') o no rellevants ('no') segons el seu contingut.
`
			break

		case ListLanguageCodes.spa:
			promptTemplate = `
Eres un evaluador que comprueba la relevancia de los documentos recuperados para una pregunta de usuario.
Aquí tienes los documentos recuperados:
\n-------\n
{context}
\n-------\n
Aquí tienes la pregunta del usuario: {question}
Evalúa si los documentos son relevantes ('yes') o no relevantes ('no') según su contenido.
`
			break

		default:
			promptTemplate = `
You are a grader assessing the relevance of retrieved documents to a user question.
Here are the retrieved documents:
\n-------\n
{context}
\n-------\n
Here is the user question: {question}
Score the documents as relevant ('yes') or not relevant ('no') based on their content.
`
	}

	const prompt = ChatPromptTemplate.fromTemplate(promptTemplate)

	const model = new ChatOpenAI({
		model: 'gpt-4o',
		temperature: 0,
	}).bindTools([tool], { tool_choice: tool.name })

	const chain = prompt.pipe(model)
	const lastMessage = messages[messages.length - 1]

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
const rewriteQuery = async (state: WorkflowStateType) => {
	const question = state.messages[0]?.content as string

	// Use the language-agnostic query transformation tool
	const enhancedQuery = await transformQueryTool.invoke(question)

	return {
		messages: [new HumanMessage(enhancedQuery)],
	}
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

	// Get the detected language from state
	const language = state.languageDetected

	// Create a language-specific prompt
	const context =
		"You're helping citizens find information from their city council."
	const promptTemplate = getLanguageSpecificPrompt(language, context)
	const prompt = ChatPromptTemplate.fromTemplate(promptTemplate)

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
 * Creates the enhanced multi-language retrieval workflow graph.
 * @param input Agent input for initializing the retriever.
 * @returns Effect that resolves to a compiled StateGraph.
 */
export const createEnhancedRetrievalWorkflow = (input: BaseAgentInput) => {
	const workflow = new StateGraph(WorkflowState)
		.addNode('agent', callAgent)
		.addNode('tools', toolsNode)
		.addNode('retrieve', qdrantToolNode)
		.addNode('gradeDocuments', gradeDocuments)
		.addNode('rewrite', rewriteQuery)
		.addNode('generate', generateResponse)

	// Add edges
	workflow.addEdge(START, 'agent')
	workflow.addConditionalEdges('agent', shouldRetrieve)
	workflow.addEdge('retrieve', 'gradeDocuments')
	workflow.addConditionalEdges('gradeDocuments', checkRelevance, {
		yes: 'generate',
		no: 'rewrite',
	})
	workflow.addEdge('generate', END)
	workflow.addEdge('rewrite', 'agent')

	// Add middleware
	const workflowLogger = createWorkflowLogger()

	// Register middleware to track language and log workflow steps
	// workflow.addMiddleware([languageTrackingMiddleware, workflowLogger])

	return workflow.compile()
}

/**
 * Runs the enhanced multi-language retrieval workflow with the provided input.
 * @param input The agent input containing the query.
 * @returns Effect that resolves to the workflow state.
 */
export const runEnhancedRetrievalWorkflow = async (
	input: BaseAgentInput,
): Promise<Partial<WorkflowStateType>> => {
	const workflow = createEnhancedRetrievalWorkflow(input)

	// Initialize state with query
	const initialState: WorkflowStateType = {
		input,
		messages: [new HumanMessage(input.question)],
		currentStep: 'agent',
		error: null,
		languageDetected: input.language || 'cat',
	}

	// Execute workflow
	const finalState = await workflow.invoke(initialState)
	return finalState
}

/**
 * Streams the enhanced multi-language retrieval workflow for incremental updates.
 * @param input The agent input containing the query.
 * @param processChunk Optional callback to process chunks before yielding
 * @yields Incremental state updates.
 */
export async function* streamEnhancedRetrievalWorkflow(
	input: BaseAgentInput,
	processChunk?: (chunk: any) => any,
) {
	const workflow = createEnhancedRetrievalWorkflow(input)

	const initialState: Partial<WorkflowStateType> = {
		input,
		messages: [new HumanMessage(input.question)],
		currentStep: 'agent',
		error: null,
		languageDetected: input.language || 'cat',
	}

	for await (const chunk of await workflow.stream(initialState)) {
		// Process the chunk if a processor is provided
		const processed = processChunk ? processChunk(chunk) : chunk

		if (processed) {
			yield processed
		}
	}
}
