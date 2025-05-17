import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import { Effect, JSONSchema, Schema } from 'effect'

import { type RouterInput, RouterOutput } from '@pacto-chat/agents-domain'
import type { WorkflowStateType } from '../state'

const routerPrompt = ChatPromptTemplate.fromTemplate(`
You are a routing agent that decides which specialized agent(s) should process a given text. Person wants the text to be processed in {language}

Currently available agents: {availableAgents}

Text to process: {text}

Additional context: {context}

Your task is to decide which agent or sequence of agents should process this text.
If isSequential is true, you can route to multiple agents in sequence.

Consider:
- The content and purpose of the text
- The user's explicit needs or preferences
- The strengths of each available agent

IMPORTANT: Only route to agents that are listed as available.
`)

export const createRouterAgent = () => {
	const llm = new ChatOpenAI({
		modelName: 'gpt-4o',
		temperature: 0.2,
	}).bind({
		functions: [
			{
				name: 'route_to_agents',
				description: 'Route the text to appropriate agent(s)',
				parameters: JSONSchema.make(RouterOutput),
			},
		],
		function_call: { name: 'route_to_agents' },
	})

	// const chain = RunnableSequence.from([
	// 	routerPrompt,
	// 	llm,
	// 	async output => {
	// 		// Extract the function call result
	// 		const funcCall = output.additional_kwargs.function_call
	// 		if (!funcCall || !funcCall.arguments) {
	// 			throw new Error('Router failed to make a decision')
	// 		}

	// 		// Parse and validate with Effect
	// 		const parsedResult = Effect.runSync(
	// 			Schema.decodeUnknown(RouterOutput)(funcCall.arguments),
	// 		)

	// 		// Convert to RouterOutput format
	// 		const routerOutput: RouterOutput = {
	// 			text: `Routing recommendation: ${parsedResult.routingReason}`,
	// 			nextAgent: parsedResult.nextAgent,
	// 			routingReason: parsedResult.routingReason,
	// 			alternativeAgents: parsedResult.alternativeAgents,
	// 		}

	// 		// Determine the next step in the workflow
	// 		let nextStep: string
	// 		if (
	// 			Array.isArray(parsedResult.nextAgent) &&
	// 			parsedResult.nextAgent.length > 0
	// 		) {
	// 			nextStep = parsedResult.nextAgent[0]
	// 		} else if (typeof parsedResult.nextAgent === 'string') {
	// 			nextStep = parsedResult.nextAgent
	// 		} else {
	// 			nextStep = 'end'
	// 		}

	// 		return {
	// 			routerOutput,
	// 			history: [`Router decision: ${parsedResult.routingReason}`],
	// 			currentStep: nextStep,
	// 		}
	// 	},
	// ])

	return async (state: WorkflowStateType) => {
		try {
			// Ensure we have the proper input structure
			const input = state.input as RouterInput

			// Default to the three agents we support if not specified
			const availableAgents = input.availableAgents || [
				'summarizer',
				'impact',
				'simplifier',
			]
			const isSequential =
				input.isSequential !== undefined ? input.isSequential : true

			return await chain.invoke({
				text: input.intent,
				language: input.language,
				context: input.additionalContext
					? JSON.stringify(input.additionalContext)
					: '',
				availableAgents: availableAgents.join(', '),
				isSequential: isSequential.toString(),
			})
		} catch (error) {
			return {
				error:
					error instanceof Error ? error.message : 'Unknown error in router',
				currentStep: 'end',
			}
		}
	}
}
