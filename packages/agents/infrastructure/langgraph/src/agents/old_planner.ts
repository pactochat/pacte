import { type BaseMessage, HumanMessage } from '@langchain/core/messages'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'

import type {
	PlanStep,
	PlannerInput,
	PlannerOutput,
} from '@pacto-chat/agents-domain'
import { type ZonedDateTimeString, nowZoned } from '@pacto-chat/shared-domain'
import type { BaseGraphState } from '../state'
import { logAgentExecution } from './utils'

/**
 * Implementation of the planner node for LangGraph
 */
export async function plannerNode(
	state: BaseGraphState,
	model: ChatOpenAI,
): Promise<Partial<BaseGraphState>> {
	try {
		// Log the execution start
		const startLog = logAgentExecution('planner', 'started')

		// Get input from state
		const input = state.input as PlannerInput
		const goal = input.goal || extractGoal(input.text)
		const constraints = input.constraints || []
		const availableResources = input.availableResources || []
		const timeline = input.timeline || 'No specific timeline provided'

		// Create prompt
		const prompt = ChatPromptTemplate.fromTemplate(`
      You are an expert project planner. Create a detailed step-by-step plan to achieve the following goal:
      
      Goal: {goal}
      
      Important constraints to consider:
      {constraints}
      
      Available resources:
      {resources}
      
      Timeline requirements:
      {timeline}
      
      For each step in your plan, include:
      1. A clear title
      2. A detailed description
      3. Estimated time to complete
      4. Dependencies on other steps
      5. Required resources
      6. Potential risks or challenges
      
      Also include:
      - The total estimated time to complete the entire plan
      - The critical path of steps that determine the minimum time to completion
      - Key risks or challenges to the overall plan
      - Recommendations for successful implementation
      
      Format your response to clearly separate each step and section.
    `)

		// Create chain
		const chain = prompt.pipe(model)

		// Log messages for tracing
		const messages: BaseMessage[] = [
			new HumanMessage(
				`Create a plan for: "${goal || input.text.substring(0, 50)}${!goal && input.text.length > 50 ? '...' : ''}"`,
			),
		]

		// Execute the chain
		const response = await chain.invoke({
			goal: goal || input.text,
			constraints:
				constraints.length > 0
					? constraints.join('\n- ')
					: 'No specific constraints provided',
			resources:
				availableResources.length > 0
					? availableResources.join('\n- ')
					: 'No specific resources listed',
			timeline,
		})

		// Add response to messages
		messages.push(response)

		// Parse steps from the response
		const steps = await parseSteps(response.content as string, model)

		// Parse additional plan details
		const planDetails = await parsePlanDetails(
			response.content as string,
			steps,
			model,
		)

		// Create the output
		const output: PlannerOutput = {
			text: response.content as string,
			goal: goal || extractGoal(input.text),
			steps,
			totalTimeEstimate: planDetails.totalTimeEstimate,
			estimatedCompletion: planDetails.estimatedCompletion,
			criticalPath: planDetails.criticalPath,
			keyRisks: planDetails.keyRisks,
			recommendations: planDetails.recommendations,
			language: input.language,
			timestamp: nowZoned().toString() as ZonedDateTimeString,
		}

		// Log completion
		const completeLog = logAgentExecution('planner', 'completed')

		// Return updated state
		return {
			output,
			agentOutputs: { planner: output },
			messages,
			executionLog: [startLog, completeLog],
		}
	} catch (error) {
		// Log error
		const errorLog = logAgentExecution('planner', 'failed')

		// Return error state
		return {
			error: `Error in planner: ${error}`,
			executionLog: [errorLog],
		}
	}
}

/**
 * Extract the goal from text if not explicitly provided
 */
function extractGoal(text: string): string {
	// Simple goal extraction - in a real implementation would use more sophisticated NLP
	const firstSentence = text.split(/[.!?][\s\n]/)[0] || ''

	if (firstSentence.length < 100) {
		return firstSentence
	}

	// If first sentence is too long, truncate
	return `${firstSentence.substring(0, 100)}...`
}

/**
 * Parse steps from LLM response
 */
async function parseSteps(
	content: string,
	model: ChatOpenAI,
): Promise<PlanStep[]> {
	// In a production system, use a structured output parser
	// Here we'll use a simple prompt to re-structure the output
	const prompt = ChatPromptTemplate.fromTemplate(`
    Parse the following plan into structured steps.
    For each step, extract:
    1. Step ID/number
    2. Title
    3. Description
    4. Time estimate (if available)
    5. Dependencies (if available)
    6. Resources needed (if available)
    7. Risks (if available)
    
    Plan content:
    {content}
    
    Output in a structured JSON format for each step.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// If the response is an array, use it directly
		if (Array.isArray(parsed)) {
			return parsed as PlanStep[]
		}

		// Otherwise, try to extract steps from the object
		if (parsed.steps && Array.isArray(parsed.steps)) {
			return parsed.steps as PlanStep[]
		}

		// Fallback: create steps from numbered properties
		const steps: PlanStep[] = []
		for (const key in parsed) {
			if (
				key.match(/step\d+|step_\d+|\d+/) &&
				typeof parsed[key] === 'object'
			) {
				steps.push({
					id: key,
					title: parsed[key].title || `Step ${key}`,
					description: parsed[key].description || '',
					timeEstimate: parsed[key].timeEstimate,
					dependencies: parsed[key].dependencies,
					resources: parsed[key].resources,
					risks: parsed[key].risks,
				})
			}
		}

		return steps
	} catch (error) {
		console.error('Failed to parse plan steps:', error)

		// Fallback - create basic steps by splitting content
		const sections = content
			.split(/Step \d+:|Phase \d+:|Stage \d+:|\n\d+\./)
			.filter(section => section.trim().length > 0)

		return sections.map((section, index) => {
			const lines = section.split('\n').filter(line => line.trim().length > 0)
			const title = lines[0]?.trim() ?? `Step ${index + 1}`
			const description = lines.slice(1).join('\n').trim()

			return {
				id: `Step ${index + 1}`,
				title,
				description,
				timeEstimate: extractTimeEstimate(section),
				dependencies: undefined,
				resources: undefined,
				risks: undefined,
			}
		})
	}
}

/**
 * Extract time estimate from text
 */
function extractTimeEstimate(text: string): string | undefined {
	const timePattern =
		/(?:time|duration|estimated time|timeframe):\s*([^.,\n]+)/i
	const match = text.match(timePattern)
	return match?.[1]?.trim()
}

/**
 * Parse additional plan details
 */
async function parsePlanDetails(
	content: string,
	steps: PlanStep[],
	model: ChatOpenAI,
): Promise<{
	totalTimeEstimate: string
	estimatedCompletion: string
	criticalPath: string[]
	keyRisks: string[]
	recommendations: string[]
}> {
	const prompt = ChatPromptTemplate.fromTemplate(`
    Extract the following details from this plan:
    
    1. Total time estimate for the entire plan
    2. Estimated completion date (if provided)
    3. Critical path steps
    4. Key risks or challenges
    5. Recommendations for implementation
    
    Plan content:
    {content}
    
    Output in JSON format with these five fields.
  `)

	const chain = prompt.pipe(model)
	const response = await chain.invoke({ content })

	try {
		// Try to parse JSON response
		const parsedContent = messageContentToString(response.content)
		const jsonMatch = parsedContent.match(/```json\n([\s\S]*?)```|{[\s\S]*}/)
		const jsonString = jsonMatch?.[1] ?? jsonMatch?.[0] ?? '{}'
		const parsed = JSON.parse(jsonString.replace(/```/g, ''))

		// Return the parsed data with defaults for missing fields
		return {
			totalTimeEstimate: parsed.totalTimeEstimate || calculateTotalTime(steps),
			estimatedCompletion:
				parsed.estimatedCompletion || estimateCompletion(steps),
			criticalPath: Array.isArray(parsed.criticalPath)
				? parsed.criticalPath
				: steps.map(s => s.id),
			keyRisks: Array.isArray(parsed.keyRisks)
				? parsed.keyRisks
				: extractRisks(content),
			recommendations: Array.isArray(parsed.recommendations)
				? parsed.recommendations
				: extractRecommendations(content),
		}
	} catch (error) {
		console.error('Failed to parse plan details:', error)

		// Fallback - extract information directly from content
		return {
			totalTimeEstimate: calculateTotalTime(steps),
			estimatedCompletion: estimateCompletion(steps),
			criticalPath: steps.map(s => s.id),
			keyRisks: extractRisks(content),
			recommendations: extractRecommendations(content),
		}
	}
}

/**
 * Calculate total time based on steps
 */
function calculateTotalTime(steps: PlanStep[]): string {
	const timeSteps = steps.filter(s => s.timeEstimate)

	if (timeSteps.length === 0) {
		return 'Not specified'
	}

	// Very simple estimation - in a real implementation would use proper time calculations
	return timeSteps.length === steps.length
		? 'Sum of all step durations'
		: 'Partially estimated based on available step durations'
}

/**
 * Estimate completion date
 */
function estimateCompletion(steps: PlanStep[]): string {
	// In a real implementation, would calculate based on dependencies and durations
	return 'Dependent on start date'
}

/**
 * Extract risks from plan content
 */
function extractRisks(content: string): string[] {
	// Look for risk section
	const riskSection = content.match(/risks?:.*?(?=\n\n|\n#|\n\*\*|$)/is)

	if (!riskSection) {
		return ['No specific risks identified']
	}

	// Split the risk section into bullet points
	return riskSection[0]
		.split(/\n-|\n\*|\n\d+\./)
		.slice(1) // Skip the header
		.map(s => s.trim())
		.filter(s => s.length > 0)
}

/**
 * Extract recommendations from plan content
 */
function extractRecommendations(content: string): string[] {
	// Look for recommendations section
	const recSection = content.match(/recommend.*?(?=\n\n|\n#|\n\*\*|$)/is)

	if (!recSection) {
		return ['No specific recommendations provided']
	}

	// Split the recommendations section into bullet points
	return recSection[0]
		.split(/\n-|\n\*|\n\d+\./)
		.slice(1) // Skip the header
		.map(s => s.trim())
		.filter(s => s.length > 0)
}

function messageContentToString(content: unknown): string {
	if (typeof content === 'string') return content
	if (Array.isArray(content)) {
		return content
			.map(c => {
				if (typeof c === 'string') return c
				if (
					typeof c === 'object' &&
					c &&
					'text' in c &&
					typeof c.text === 'string'
				)
					return c.text
				return ''
			})
			.join('')
	}
	return ''
}
