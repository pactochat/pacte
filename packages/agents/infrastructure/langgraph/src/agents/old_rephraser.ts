import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type { RephraserInput, RephraserOutput } from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../state'
import { logAgentExecution } from './utils'

/**
 * Implementation of the rephraser node for LangGraph
 */
export async function rephraserNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('rephraser', 'started')

		// Get input from state
		const input = state.input as RephraserInput

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert content rewriter. Rephrase the following text in a {style} style with a {tone} tone.
      
      The original text has this language style: {textDescription}
      
      Maintain the original meaning while changing the phrasing, vocabulary, and sentence structure.
      
      Original text:
      {text}
      
      Rephrased text:
    `)

		// Analyze the text to provide context
		const textDescription = await generateTextDescription(input.text, model)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Rephrase text: "${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			text: input.text,
			textDescription,
		})

		// Add response to messages
		messages.push(response)

		// Create the output
		const output: RephraserOutput = {
			text: response.content as string,
			originalText: input.text,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		const completeLog = logAgentExecution('rephraser', 'completed')

		// Updated state
		return {
			output,
			agentOutputs: { rephraser: output },
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('rephraser', 'failed')

		// Return error state
		return {
			error: `Error in rephraser: ${error}`,
			executionLog: [errorLog],
		}
	}
}

/**
 * Generate a description of the text's current style
 */
async function generateTextDescription(
	text: string,
	model: ChatOpenAI,
): Promise<string> {
	const prompt = ChatPromptTemplate.fromTemplate(`
    Analyze the following text and describe its current language style, tone, and formality level.
    Keep your response concise (under 50 words).
    
    Text to analyze:
    {text}
    
    Style description:
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ text })

	return response.content as string
}
