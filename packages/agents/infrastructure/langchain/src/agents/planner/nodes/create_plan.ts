import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'

import { logAgentsInfraLangchain } from '@aipacto/shared-utils-logging'
import type { PlannerAgentStateType } from '../types'

export async function createPlanNode(
	state: PlannerAgentStateType,
	config?: RunnableConfig,
): Promise<Partial<PlannerAgentStateType>> {
	// Get the user's query from the last message or context
	const lastMessage = state.messages[state.messages.length - 1]
	const userQuery =
		typeof lastMessage?.content === 'string'
			? lastMessage.content
			: state.context?.question

	try {
		if (!userQuery) {
			logAgentsInfraLangchain.warn(
				'[Planner.createPlanNode] Missing question in messages/context',
			)
			return {
				error: 'Question is missing for planning',
			}
		}

		// Setup the model
		const llm = new ChatOpenAI({
			modelName: 'gpt-4o',
			temperature: 0.2,
		})

		// Create the prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert planner. Create an actionable plan for the following request:

REQUEST: {text}

Create a step-by-step plan with:
1. Clear objectives
2. Actionable steps
3. Required resources
4. Timeline

Format your response as JSON:
{
  "title": "Plan title",
  "objectives": ["objective 1", "objective 2", ...],
  "steps": [
    {
      "step": "Step 1",
      "description": "Description of step 1",
      "timeframe": "Timeframe for step 1"
    },
    // more steps...
  ],
  "resources": ["resource 1", "resource 2", ...],
  "timeline": "Overall timeline"
}
`)

		// Run the planning
		const chain = prompt.pipe(llm)
		const response = await chain.invoke({ text: userQuery }, config)

		// Parse the response
		const responseText = response.content.toString()
		const jsonMatch = responseText.match(/({[\s\S]*})/)

		if (!jsonMatch || !jsonMatch[1]) {
			throw new Error('Failed to parse planning response')
		}

		const planData = JSON.parse(jsonMatch[1])

		return {
			planner: {
				...planData,
				originalText: userQuery,
			},
			error: null,
		}
	} catch (error) {
		logAgentsInfraLangchain.error(
			'[Planner.createPlanNode] Error creating plan',
			{ error },
		)

		return {
			error:
				error instanceof Error ? error.message : 'Unknown error in planning',
		}
	}
}
